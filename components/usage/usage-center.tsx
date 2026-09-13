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
      <div className="usage-center-overview">
        <p>
          过去 24 小时已使用 <strong>{getTotalLast24Hours(data)}</strong> 次额度
        </p>
        <span>更新于 {new Date(data.generatedAt).toLocaleString("zh-CN")}</span>
      </div>

      <UsageSummaryGrid summaries={data.summaries} />
      <RecentUsageList records={data.recentRecords} />
    </section>
  );
}
