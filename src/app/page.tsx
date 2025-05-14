import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { DashboardWrapper } from "~/app/_components/dashboard/wrapper/dashboardWrapper";

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
        <DashboardWrapper />
      </HydrateClient>
    </SessionProvider>
  );
}
