import { db } from "~/server/db";
import { gmailClient } from "~/server/gmail/client";
import { simpleParser } from "mailparser";
import { uploadToS3 } from "~/server/s3";

export async function syncGmailEmails(userId: string) {
  const gmail = await gmailClient(userId);

  console.log(`[SYNC] Starting Gmail sync for user: ${userId}`);

  // get user's last internal date checkpoint (TODO: change to next page token from google api)
  const checkpoint = await db.emailSyncCheckpoint.findUnique({
    where: { userId },
  });

  const lastInternalDate = checkpoint?.lastInternalDate;
  console.log(`[SYNC] Last internal date checkpoint: ${lastInternalDate?.toISOString() ?? "None"}`);

  // TODO: only getting inbox and sent messages, need to get all messages for all labels
  const fetchMessages = async (labelId: string) => {
    const { data } = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
      labelIds: [labelId],
      q: lastInternalDate
        ? `after:${Math.floor(lastInternalDate.getTime() / 1000)}`
        : undefined,
    });
    return data.messages ?? [];
  };

  const [inboxMessages, sentMessages] = await Promise.all([
    fetchMessages("INBOX"),
    fetchMessages("SENT"),
  ]);

  const messages = [...inboxMessages, ...sentMessages];
  if (messages.length === 0) {
    console.log("[SYNC] No new messages to sync.");
    return;
  }

  let newestInternalDate: Date | undefined = undefined;

  for (const message of messages) {
    const messageId = message.id;
    if (!messageId) continue;

    try {
      const exists = await db.email.findUnique({
        where: { id: messageId },
      });
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
      console.log("parsed", parsed);

      // html to s3
      let htmlUrl: string | null = null;
      if (parsed.html) {
        try {
          htmlUrl = await uploadToS3(`emails/${messageId}.html`, parsed.html);
        } catch (error) {
          console.error(`[SYNC] Failed to upload HTML for ${messageId}:`, error);
        }
      }
      const parser = await simpleParser(raw);
      const attachments = parser.attachments;
      console.log(attachments);

      // attachments to s3 and create attachment records
      const attachmentRecords = await Promise.all(
        attachments.map(async (attachment) => {
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
      );

      // persist all to db
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
          attachments: {
            create: attachmentRecords.filter((record): record is NonNullable<typeof record> => record !== null)
          }
        },
      });

      console.log(`[SYNC] Synced email ${messageId}`);

      // update checkpoint (TODO: change to next page token from google api)
      const parsedDate = parsed.date;
      if (parsedDate && (!newestInternalDate || parsedDate > newestInternalDate)) {
        newestInternalDate = parsedDate;
      }
    } catch (error) {
      console.error(`[SYNC] Failed syncing email ${messageId}`, error);
    }
  }

  // update checkpoint (TODO: change to next page token from google api)
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
