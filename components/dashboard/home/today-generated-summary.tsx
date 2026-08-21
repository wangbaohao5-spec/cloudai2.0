import type { DashboardHomeData } from "@/lib/dashboard-home";

type TodayGeneratedSummaryProps = {
  recentOutputCount: number;
  recentProductCount: number;
  stats: DashboardHomeData["todayGenerated"];
};

export function TodayGeneratedSummary({ recentOutputCount, recentProductCount, stats }: TodayGeneratedSummaryProps) {
  const summaryItems = [
    { label: "今日创作", value: stats.total },
    { label: "最近商品", value: recentProductCount },
    { label: "商品素材", value: recentOutputCount },
    { label: "图片任务", value: stats.image + stats.imageEnhance },
  ];

  return (
    <section className="today-generated-card cai-card cai-card--compact">
      <div className="today-generated-header">
        <p className="eyebrow">Overview</p>
        <h2>创作概览</h2>
        <p>查看今天的生成量和当前素材状态。</p>
      </div>
      <div className="today-generated-list">
        {summaryItems.map((item) => (
          <article className="cai-card cai-card--compact cai-card--muted" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
