import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";
import DashboardShell from "./_components/dashboard/wrapper/dashboardWrapper";
import { SessionProvider } from "next-auth/react";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  void api.gmail.getInfiniteEmails.prefetch({
    limit: 20,
    labelIds: ["INBOX"],
  });

  return (
    <SessionProvider session={session}>
      <HydrateClient>
        <DashboardShell />
      </HydrateClient>
    </SessionProvider>
  );
}
