import { db } from "~/server/db";
import { gmailClient } from "~/server/gmail/client";
import { simpleParser } from "mailparser";
import { uploadToS3 } from "~/server/s3";
import type { gmail_v1 } from "googleapis";

type GmailMessage = NonNullable<gmail_v1.Schema$Message>;

async function fullSync(gmail: gmail_v1.Gmail, userId: string, lastInternalDate?: Date) {
  const fetchMessages = async (labelId: string): Promise<GmailMessage[]> => {
    const { data } = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
      labelIds: [labelId],
      q: lastInternalDate ? `after:${Math.floor(lastInternalDate.getTime() / 1000)}` : undefined,
    });
    return data.messages ?? [];
  };

  const [inboxMessages, sentMessages] = await Promise.all([
    fetchMessages("INBOX"),
    fetchMessages("SENT"),
  ]);

  return [...inboxMessages, ...sentMessages];
}

export async function syncGmailEmails(userId: string) {
  const gmail = await gmailClient(userId);
  console.log(`[SYNC] Starting Gmail sync for user: ${userId}`);

  const checkpoint = await db.emailSyncCheckpoint.findUnique({ where: { userId } });
  const { lastHistoryId, lastInternalDate } = checkpoint ?? {};

  let messagesToProcess: GmailMessage[] = [];

  if (lastHistoryId) {
    console.log(`[SYNC] Using incremental sync from historyId: ${lastHistoryId}`);
    try {
      const res = await gmail.users.history.list({
        userId: "me",
        startHistoryId: lastHistoryId,
        historyTypes: ["messageAdded"],
        maxResults: 1000,
      });

      if (res.data.history) {
        res.data.history.forEach((history) => {
          history.messagesAdded?.forEach((msg) => {
            if (msg.message) messagesToProcess.push(msg.message);
          });
        });

        const latestHistoryId = res.data.historyId ?? res.data.history?.[res.data.history.length - 1]?.id;
        if (latestHistoryId) {
          await db.emailSyncCheckpoint.upsert({
            where: { userId },
            update: { lastHistoryId: latestHistoryId.toString() },
            create: { userId, lastHistoryId: latestHistoryId.toString() },
          });
        }
      } else {
        console.log("[SYNC] No new history updates found.");
        return;
      }
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 404) {
        console.warn("[SYNC] Invalid historyId, falling back to full sync.");
        messagesToProcess = await fullSync(gmail, userId, lastInternalDate ?? undefined);
      } else {
        console.error("[SYNC] History sync failed:", err);
        return;
      }
    }
  } else {
    console.log("[SYNC] No historyId found, performing full sync.");
    messagesToProcess = await fullSync(gmail, userId, lastInternalDate ?? undefined);
  }

  if (messagesToProcess.length === 0) {
    console.log("[SYNC] No new messages to sync.");
    return;
  }

  let newestInternalDate: Date | undefined = undefined;

  for (const msg of messagesToProcess) {
    const messageId = msg.id;
    if (!messageId) continue;

    try {
      const exists = await db.email.findUnique({ where: { id: messageId } });
      if (exists) continue;

      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "raw",
      });

      if (!fullMessage.data.raw) continue;

      const base64 = fullMessage.data.raw.replace(/-/g, '+').replace(/_/g, '/');
      const raw = Buffer.from(base64, 'base64');
      const parsed = await simpleParser(raw);

      // Fallback logic for extracting HTML
      let resolvedHtml = parsed.html ?? parsed.textAsHtml ?? null;
      if (!resolvedHtml && parsed.multipart && parsed.parts) {
        const htmlPart = parsed.parts.find(part => part.contentType === "text/html");
        if (htmlPart && typeof htmlPart.content === "string") {
          resolvedHtml = htmlPart.content;
        }
      }

      const attachmentRecords = await Promise.all(
        (parsed.attachments ?? []).map(async (attachment) => {
          if (!attachment.content || !attachment.filename) return null;
          try {
            const url = await uploadToS3(
              `attachments/${messageId}/${attachment.filename}`,
              attachment.content.toString('base64')
            );
            return {
              id: `${messageId}-${attachment.filename}`,
              filename: attachment.filename,
              contentType: attachment.contentType,
              size: attachment.size,
              url,
              cid: attachment.cid,
            };
          } catch (error) {
            console.error(`[SYNC] Failed to upload attachment ${attachment.filename}:`, error);
            return null;
          }
        })
      ).then((records) => records.filter((r): r is NonNullable<typeof r> => r !== null));

      let processedHtml = resolvedHtml;
      if (processedHtml && attachmentRecords.length > 0) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(processedHtml, "text/html");
        const images = doc.getElementsByTagName("img");

        for (const img of Array.from(images)) {
          const src = img.getAttribute("src");
          if (src?.startsWith("cid:")) {
            const cid = src.replace("cid:", "");
            const matchingAttachment = attachmentRecords.find(a => a.cid === cid);
            if (matchingAttachment) {
              img.setAttribute("src", matchingAttachment.url);
            }
          }
        }

        processedHtml = doc.documentElement.outerHTML;
      }

      let htmlUrl: string | null = null;
      if (processedHtml) {
        try {
          htmlUrl = await uploadToS3(`emails/${messageId}.html`, processedHtml);
          console.log("BABABOOY", processedHtml);
        } catch (error) {
          console.error(`[SYNC] Failed to upload HTML for ${messageId}:`, error);
        }
      }

      await db.email.create({
        data: {
          id: messageId,
          userId,
          subject: parsed.subject ?? null,
          from: parsed.from?.text ?? null,
          snippet: parsed.text?.substring(0, 200) ?? null,
          internalDate: parsed.date ?? null,
          isRead: !fullMessage.data.labelIds?.includes("UNREAD"),
          labelIds: fullMessage.data.labelIds ?? [],
          threadId: fullMessage.data.threadId ?? null,
          htmlUrl,
          text: parsed.text ?? null,
          attachments: { create: attachmentRecords },
        },
      });

      console.log(`[SYNC] Synced email ${messageId}`);

      const parsedDate = parsed.date;
      if (parsedDate && (!newestInternalDate || parsedDate > newestInternalDate)) {
        newestInternalDate = parsedDate;
      }
    } catch (error) {
      console.error(`[SYNC] Failed syncing email ${messageId}`, error);
    }
  }

  if (newestInternalDate) {
    await db.emailSyncCheckpoint.upsert({
      where: { userId },
      update: { lastInternalDate: newestInternalDate },
      create: { userId, lastInternalDate: newestInternalDate },
    });
    console.log(`[SYNC] Updated sync checkpoint to ${newestInternalDate.toISOString()}`);
  }

  console.log(`[SYNC] Finished Gmail sync for user: ${userId}`);
}
