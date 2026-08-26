import type { UsageCenterSummary } from "@/lib/usage";
import { USAGE_LIMITS } from "@/lib/usage-limits";

type UsageSummaryGridProps = {
  summaries: UsageCenterSummary[];
};

function formatRule(windowSeconds: number, max: number) {
  if (windowSeconds >= 24 * 60 * 60) {
    return `过去 24 小时 ${max} 次`;
  }

  if (windowSeconds >= 60) {
    return `${Math.floor(windowSeconds / 60)} 分钟 ${max} 次`;
  }

  return `${windowSeconds} 秒 ${max} 次`;
}

export function UsageSummaryGrid({ summaries }: UsageSummaryGridProps) {
  return (
    <section className="usage-stat-panel glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Quota 24H</p>
          <h2>过去 24 小时额度</h2>
        </div>
        <span>按当前用户统计</span>
      </div>
      <div className="usage-center-grid">
        {summaries.map((summary) => (
          <article className="usage-center-card" key={summary.type}>
            <div>
              <span>{summary.label}</span>
              <strong>{summary.usedLast24Hours}</strong>
            </div>
            <p>
              上限 {summary.limitLast24Hours} 次，剩余 {summary.remainingLast24Hours} 次
            </p>
            <small>{USAGE_LIMITS[summary.type].map((rule) => formatRule(rule.windowSeconds, rule.max)).join(" / ")}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
