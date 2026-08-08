import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getCurrentUser } from "@/lib/current-user";
import { getRecentHistory } from "@/lib/history";
import { getUsageStats } from "@/lib/usage";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [usageStats, recentHistory] = await Promise.all([getUsageStats(user.id), getRecentHistory(user.id, 8)]);

  return <DashboardOverview recentHistory={recentHistory} usageStats={usageStats} />;
}
