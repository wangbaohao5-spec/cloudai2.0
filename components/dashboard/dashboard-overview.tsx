import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentTasks } from "@/components/dashboard/recent-tasks";
import { UsageStats } from "@/components/dashboard/usage-stats";

export function DashboardOverview() {
  return (
    <main className="dashboard-content">
      <section className="dashboard-overview">
        <div className="dashboard-overview-hero glass-card">
          <p className="eyebrow">CloudAI Workspace</p>
          <h2>欢迎使用 CloudAI</h2>
          <p>你的 AI 电商创作助手</p>
        </div>

        <UsageStats />
        <QuickActions />
        <RecentTasks />
      </section>
    </main>
  );
}
