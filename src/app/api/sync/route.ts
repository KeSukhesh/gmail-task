import { db } from "~/server/db";
import { syncGmailEmails } from "~/server/gmail/sync";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not set in environment variables");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await db.user.findMany({
      where: {
        accounts: {
          some: {
            provider: "google",
          },
        },
      },
    });

    const results = await Promise.all(
      users.map(async (user) => {
        try {
          await syncGmailEmails(user.id);
          return { userId: user.id, status: "success" };
        } catch (error) {
          console.error(`Failed to sync emails for user ${user.id}:`, error);
          return { userId: user.id, status: "error", error: String(error) };
        }
      })
    );

    const successful = results.filter(r => r.status === "success").length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      summary: {
        total: users.length,
        successful,
        failed,
      },
      details: results,
    });

  } catch (error) {
    console.error("Failed to sync emails:", error);
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}
