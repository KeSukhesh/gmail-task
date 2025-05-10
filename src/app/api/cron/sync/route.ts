import { db } from "~/server/db";
import { syncGmailEmails } from "~/server/gmail/sync";
import { NextResponse } from "next/server";

// Endpoint for cron job to sync emails for all users
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
    // get all users with google accounts
    const users = await db.user.findMany({
      where: {
        accounts: {
          some: {
            provider: "google",
          },
        },
      },
    });

    const results = await Promise.allSettled(
      users.map(async (user) => {
        try {
          await syncGmailEmails(user.id);
          return { userId: user.id, status: "success" };
        } catch (error) {
          console.error(`Failed to sync emails for user ${user.id}:`, error);
          return { userId: user.id, status: "error", error };
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

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