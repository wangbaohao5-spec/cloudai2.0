import type { UsageStats as UsageStatsData } from "@/lib/usage";

type UsageStatsProps = {
  stats: UsageStatsData;
};

const usageTypeLabels = [
  { label: "AI 助手", value: "chat" },
  { label: "文案生成", value: "copywriting" },
  { label: "图片生成", value: "image" },
  { label: "图片优化", value: "image-enhance" },
  { label: "视频生成", value: "video" },
  { label: "商品分析", value: "product-analysis" },
] as const;

export function UsageStats({ stats }: UsageStatsProps) {
  return (
    <section className="usage-stat-panel glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Quota</p>
          <h2>额度统计</h2>
        </div>
        <span>真实数据</span>
      </div>
      <div className="usage-stat-grid">
        <article className="usage-stat-card">
          <span>今日额度使用</span>
          <strong>{stats.today}</strong>
        </article>
        <article className="usage-stat-card">
          <span>本月额度使用</span>
          <strong>{stats.month}</strong>
        </article>
        <article className="usage-stat-card">
          <span>累计额度使用</span>
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
