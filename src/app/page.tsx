import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";
import DashboardShell from "./_components/dashboard/wrapper/dashboardWrapper";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <DashboardShell />
    </HydrateClient>
  );
}
