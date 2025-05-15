import { db } from "~/server/db";
import { gmailClient } from "~/server/gmail/client";
import { simpleParser, type AddressObject } from "mailparser";
import { uploadToS3 } from "~/server/s3";
import type { gmail_v1 } from "googleapis";

type GmailMessage = NonNullable<gmail_v1.Schema$Message>;
type GmailListResponse = gmail_v1.Schema$ListMessagesResponse;
type GmailThreadResponse = gmail_v1.Schema$Thread;

const labelsToSync = ["INBOX", "SENT"];

export async function syncGmailEmails(userId: string) {
  const gmail = await gmailClient(userId);
  console.log(`[SYNC] Starting Gmail sync for user: ${userId}`);

  const checkpoint = await db.emailSyncCheckpoint.findUnique({ where: { userId } });
  const { lastHistoryId } = checkpoint ?? {};

  const processMessage = async (msg: GmailMessage) => {
    const messageId = msg.id;
    if (!messageId) return;
  
    const exists = await db.email.findUnique({ where: { id: messageId } });
    if (exists) return;
  
    const fullMessage = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "raw",
    });
  
    if (!fullMessage.data.raw) return;
  
    const payloadHeaders = fullMessage.data.payload?.headers ?? [];
    const getHeader = (name: string) =>
      payloadHeaders.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
  
    const messageIdHeader = getHeader("Message-ID");
    const inReplyTo = getHeader("In-Reply-To");
    const references = getHeader("References");
  
    const base64 = fullMessage.data.raw.replace(/-/g, "+").replace(/_/g, "/");
    const raw = Buffer.from(base64, "base64");
    const parsed = await simpleParser(raw);
  
    const resolvedHtml = parsed.html ?? parsed.textAsHtml ?? null;
  
    const attachmentRecords = await Promise.all(
      (parsed.attachments ?? []).map(async (attachment) => {
        if (!attachment.content || !attachment.filename) return null;
        try {
          const url = await uploadToS3(`attachments/${messageId}/${attachment.filename}`, attachment.content.toString("base64"));
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
    ).then(records => records.filter(r => r !== null));

    let htmlUrl: string | null = null;
    if (resolvedHtml) {
      try {
        htmlUrl = await uploadToS3(`emails/${messageId}.html`, resolvedHtml);
      } catch (error) {
        console.error(`[SYNC] Failed to upload HTML for ${messageId}:`, error);
      }
    }

    const now = new Date();

    const participants = [
      ...getParticipants(parsed.from),
      ...getParticipants(parsed.to),
      ...getParticipants(parsed.cc),
    ];

    for (const participant of participants) {
      const participantEmail = participant.address?.toLowerCase();
      const participantName = participant.name ?? participantEmail;

      if (!participantEmail) continue;

      const domain = extractDomain(participantEmail);

      // 🟢 Upsert Person
      await db.person.upsert({
        where: { userId_email: { userId, email: participantEmail } },
        update: {
          name: participantName,
          lastInteracted: now,
          interactionCount: { increment: 1 },
        },
        create: {
          email: participantEmail,
          name: participantName,
          userId,
          companyDomain: domain,
          lastInteracted: now,
          interactionCount: 1,
        },
      });

      // 🟢 Upsert Company if domain exists
      if (domain) {
        const existingCompany = await db.company.findFirst({
          where: { userId, domains: { has: domain } },
        });

        if (existingCompany) {
          await db.company.update({
            where: { id: existingCompany.id },
            data: {
              lastInteracted: now,
              interactionCount: { increment: 1 },
            },
          });
        } else {
          await db.company.create({
            data: {
              userId,
              name: domain, // You can optionally resolve real names if you want
              domains: [domain],
              lastInteracted: now,
              interactionCount: 1,
            },
          });
        }
      }
    }

    // 🟢 Create Email Record
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
        messageIdHeader,
        inReplyTo,
        references,
        htmlUrl,
        text: parsed.text ?? null,
        attachments: {
          create: attachmentRecords,
        },
      },
    });

    console.log(`[SYNC] Synced email ${messageId}`);
  };

  try {
    if (lastHistoryId) {
      console.log(`[SYNC] Attempting incremental sync from historyId: ${lastHistoryId}`);
      const res = await gmail.users.history.list({
        userId: "me",
        startHistoryId: lastHistoryId,
        historyTypes: ["messageAdded"],
        maxResults: 1000,
      });

      const latestHistoryId = res.data.historyId;
      if (res.data.history) {
        const newMessageIds = res.data.history.flatMap(h =>
          h.messagesAdded?.map(ma => ma.message?.id) ?? []
        ).filter((id): id is string => id !== undefined);

        // Expand all found messages to their full threads
        for (const messageId of newMessageIds) {
          const message = await gmail.users.messages.get({ userId: "me", id: messageId });
          const threadId = message.data.threadId;
          if (threadId) {
            const thread = await gmail.users.threads.get({ userId: "me", id: threadId });
            for (const threadMsg of thread.data.messages ?? []) {
              await processMessage(threadMsg);
            }
          } else {
            await processMessage(message.data);
          }
        }
      }

      // Always update checkpoint even if no new messages
      if (latestHistoryId) {
        await db.emailSyncCheckpoint.upsert({
          where: { userId },
          update: { lastHistoryId: latestHistoryId.toString() },
          create: { userId, lastHistoryId: latestHistoryId.toString() },
        });
        console.log(`[SYNC] Updated historyId checkpoint to ${latestHistoryId}`);
      }

    } else {
      console.log("[SYNC] No historyId found, performing full sync.");
      for (const label of labelsToSync) {
        let pageToken: string | undefined = undefined;
        do {
          const listRes = await gmail.users.messages.list({
            userId: "me",
            labelIds: [label],
            maxResults: 100,
            pageToken,
          }) as { data: GmailListResponse };

          const msgs = listRes.data.messages ?? [];
          for (const msgMeta of msgs) {
            const threadId = msgMeta.threadId;
            if (threadId) {
              const thread = await gmail.users.threads.get({ userId: "me", id: threadId }) as { data: GmailThreadResponse };
              for (const threadMsg of thread.data.messages ?? []) {
                await processMessage(threadMsg);
              }
            } else {
              const message = await gmail.users.messages.get({ userId: "me", id: msgMeta.id! });
              await processMessage(message.data);
            }
          }
          pageToken = listRes.data.nextPageToken ?? undefined;
        } while (pageToken);
      }

      const profileRes = await gmail.users.getProfile({ userId: "me" });
      const latestHistoryId = profileRes.data.historyId;

      if (latestHistoryId) {
        await db.emailSyncCheckpoint.upsert({
          where: { userId },
          update: { lastHistoryId: latestHistoryId.toString() },
          create: { userId, lastHistoryId: latestHistoryId.toString() },
        });
        console.log(`[SYNC] Set initial historyId checkpoint to ${latestHistoryId}`);
      }
    }

  } catch (error) {
    console.error("[SYNC] Sync failed:", error);
  }

  console.log(`[SYNC] Finished Gmail sync for user: ${userId}`);
}

// Helper to extract domain from email address
function extractDomain(email: string | undefined): string | null {
  if (!email) return null;
  const match = /@([\w.-]+)/.exec(email);
  return match?.[1]?.toLowerCase() ?? null;
}

function getParticipants(addressObject?: AddressObject | AddressObject[] | null) {
  if (!addressObject) return [];
  const objects = Array.isArray(addressObject) ? addressObject : [addressObject];
  return objects.flatMap(obj => obj.value);
}