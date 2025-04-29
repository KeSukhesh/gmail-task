import { db } from "~/server/db";
import { gmailClient } from "~/server/gmail/client";
import { simpleParser } from "mailparser";
import type { ParsedMail } from "mailparser";
import { uploadToS3 } from "~/server/s3";

export async function syncGmailEmails(userId: string) {
  const gmail = await gmailClient(userId);

  console.log(`[SYNC] Starting Gmail sync for user: ${userId}`);

  // Fetch the latest 100 emails (can adjust)
  const { data } = await gmail.users.messages.list({
    userId: "me",
    maxResults: 100,
  });

  const messages = data.messages ?? [];

  for (const message of messages) {
    const messageId = message.id;
    if (!messageId) continue;

    try {
      // Check if email already exists
      const exists = await db.email.findUnique({
        where: { id: messageId },
      });
      if (exists) continue; // Skip if already synced

      // Fetch full email
      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "raw",
      });

      if (!fullMessage.data.raw) continue;

      // Decode base64url to base64
      const base64 = fullMessage.data.raw.replace(/-/g, '+').replace(/_/g, '/');
      const raw = Buffer.from(base64, 'base64');

      // Parse email using mailparser
      const parsed = await simpleParser(raw);

      // Upload HTML to S3 if exists
      let htmlUrl: string | null = null;
      if (parsed.html) {
        try {
          htmlUrl = await uploadToS3(`emails/${messageId}.html`, parsed.html);
          console.log(`[SYNC] Uploaded HTML for ${messageId} to ${htmlUrl}`);
        } catch (error) {
          console.error(`[SYNC] Failed to upload HTML for ${messageId}:`, error);
          // Continue without HTML URL
        }
      }

      // Save email to DB
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
        },
      });

      console.log(`[SYNC] Synced email ${messageId}`);
    } catch (error) {
      console.error(`[SYNC] Failed syncing email ${messageId}`, error);
      // continue to next email
    }
  }

  console.log(`[SYNC] Finished Gmail sync for user: ${userId}`);
}
