import { Suspense } from "react";
import { DashboardWrapper } from "~/app/_components/dashboard/wrapper/dashboardWrapper";
import { api } from "~/trpc/server";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
      redirect("/login");
    }

  // Prefetch network data
  await Promise.all([
    api.network.getAll.prefetch({ type: "PEOPLE" }),
    api.network.getAll.prefetch({ type: "COMPANIES" }),
  ]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardWrapper />
    </Suspense>
  );
}