import { RecentUsageList } from "@/components/usage/recent-usage-list";
import { UsageSummaryGrid } from "@/components/usage/usage-summary-grid";
import type { UsageCenterData } from "@/lib/usage";

type UsageCenterProps = {
  data: UsageCenterData;
};

function getTotalLast24Hours(data: UsageCenterData) {
  return data.summaries.reduce((total, summary) => total + summary.usedLast24Hours, 0);
}

export function UsageCenter({ data }: UsageCenterProps) {
  return (
    <section className="usage-center">
      <div className="dashboard-overview-hero glass-card">
        <p className="eyebrow">Quota Center</p>
        <h2>额度中心</h2>
        <p>查看图片、文案、视频和商品分析等能力的额度使用情况。</p>
        <div className="usage-center-hero-meta">
          <span>过去 24 小时已使用 {getTotalLast24Hours(data)} 次额度</span>
          <span>更新于 {new Date(data.generatedAt).toLocaleString("zh-CN")}</span>
        </div>
      </div>

      <UsageSummaryGrid summaries={data.summaries} />
      <RecentUsageList records={data.recentRecords} />
    </section>
  );
}
