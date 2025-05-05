import { google } from "googleapis";
import { db } from "~/server/db";

export async function gmailClient(userId: string) {
  const account = await db.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account?.access_token || !account?.refresh_token) {
    throw new Error("Missing Google account tokens for user");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });
  console.log("access", account.access_token);
  console.log("refresh", account.refresh_token);

  oauth2Client.on("tokens", (tokens) => {
    void (async () => {
      try {
        if (tokens.refresh_token) {
          await db.account.updateMany({
            where: { userId, provider: "google" },
            data: { refresh_token: tokens.refresh_token },
          });
        }
        if (tokens.access_token) {
          await db.account.updateMany({
            where: { userId, provider: "google" },
            data: { access_token: tokens.access_token },
          });
        }
      } catch (error) {
        console.error("Failed to update tokens:", error);
      }
    })();
  });

  const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client,
  });

  return gmail;
}
