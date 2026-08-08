import type { UsageCenterData } from "@/lib/usage";
import { RecentUsageList } from "@/components/usage/recent-usage-list";
import { UsageSummaryGrid } from "@/components/usage/usage-summary-grid";

type UsageCenterProps = {
  data: UsageCenterData;
};

function getTotalToday(data: UsageCenterData) {
  return data.summaries.reduce((total, summary) => total + summary.today, 0);
}

export function UsageCenter({ data }: UsageCenterProps) {
  return (
    <section className="usage-center">
      <div className="dashboard-overview-hero glass-card">
        <p className="eyebrow">Usage Center</p>
        <h2>用量中心</h2>
        <p>查看当前账号的 AI 调用次数、每日保护限制和最近调用记录。</p>
        <div className="usage-center-hero-meta">
          <span>今日总调用 {getTotalToday(data)} 次</span>
          <span>更新于 {new Date(data.generatedAt).toLocaleString("zh-CN")}</span>
        </div>
      </div>

      <UsageSummaryGrid summaries={data.summaries} />
      <RecentUsageList records={data.recentRecords} />
    </section>
  );
}
