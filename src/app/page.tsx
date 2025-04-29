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

  // will be prefetching once we have proper backend sync func setup
  // void api.post.getLatest.prefetch();

  return (
    <SessionProvider session={session}>
      <HydrateClient>
        <DashboardShell />
      </HydrateClient>
    </SessionProvider>
  );
}
