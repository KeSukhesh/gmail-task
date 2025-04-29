import { auth } from "~/server/auth";
import { syncGmailEmails } from "~/server/gmail/sync";
import { NextResponse } from "next/server";

// Public endpoint that the cron job will hit
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncGmailEmails(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to sync emails:", error);
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}
