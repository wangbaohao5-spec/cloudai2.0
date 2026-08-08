import type { UsageStats as UsageStatsData } from "@/lib/usage";

type UsageStatsProps = {
  stats: UsageStatsData;
};

const usageTypeLabels = [
  { label: "Chat", value: "chat" },
  { label: "文案", value: "copywriting" },
  { label: "图片", value: "image" },
  { label: "图片优化", value: "image-enhance" },
  { label: "视频", value: "video" },
  { label: "商品分析", value: "product-analysis" },
] as const;

export function UsageStats({ stats }: UsageStatsProps) {
  return (
    <section className="usage-stat-panel glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Usage</p>
          <h2>使用统计</h2>
        </div>
        <span>真实数据</span>
      </div>
      <div className="usage-stat-grid">
        <article className="usage-stat-card">
          <span>今日 AI 调用次数</span>
          <strong>{stats.today}</strong>
        </article>
        <article className="usage-stat-card">
          <span>本月 AI 调用次数</span>
          <strong>{stats.month}</strong>
        </article>
        <article className="usage-stat-card">
          <span>累计 AI 调用次数</span>
          <strong>{stats.total}</strong>
        </article>
      </div>
      <div className="usage-type-grid">
        {usageTypeLabels.map((item) => (
          <article className="usage-type-card" key={item.value}>
            <span>{item.label}</span>
            <strong>{stats.byType[item.value]}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
