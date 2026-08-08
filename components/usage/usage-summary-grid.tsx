import type { UsageCenterSummary } from "@/lib/usage";
import { USAGE_LIMITS } from "@/lib/usage-limits";

type UsageSummaryGridProps = {
  summaries: UsageCenterSummary[];
};

function formatRule(windowSeconds: number, max: number) {
  if (windowSeconds >= 24 * 60 * 60) {
    return `每日 ${max} 次`;
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
          <p className="eyebrow">Usage Today</p>
          <h2>今日 AI 调用次数</h2>
        </div>
        <span>按当前用户统计</span>
      </div>
      <div className="usage-center-grid">
        {summaries.map((summary) => (
          <article className="usage-center-card" key={summary.type}>
            <div>
              <span>{summary.label}</span>
              <strong>{summary.today}</strong>
            </div>
            <p>
              每日限制 {summary.dailyLimit} 次，剩余 {summary.remainingToday} 次
            </p>
            <small>{USAGE_LIMITS[summary.type].map((rule) => formatRule(rule.windowSeconds, rule.max)).join(" / ")}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
