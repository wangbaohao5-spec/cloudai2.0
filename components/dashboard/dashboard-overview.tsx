import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentTasks } from "@/components/dashboard/recent-tasks";
import { UsageStats } from "@/components/dashboard/usage-stats";
import type { UsageStats as UsageStatsData } from "@/lib/usage";
import type { HistoryRecord } from "@/lib/types";

type DashboardOverviewProps = {
  recentHistory: HistoryRecord[];
  usageStats: UsageStatsData;
};

export function DashboardOverview({ recentHistory, usageStats }: DashboardOverviewProps) {
  return (
    <main className="dashboard-content">
      <section className="dashboard-overview">
        <div className="dashboard-overview-hero glass-card">
          <p className="eyebrow">CloudAI Workspace</p>
          <h2>欢迎使用 CloudAI</h2>
          <p>你的 AI 电商创作助手</p>
        </div>

        <UsageStats stats={usageStats} />
        <QuickActions />
        <RecentTasks records={recentHistory} />
      </section>
    </main>
  );
}
