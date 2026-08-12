import type { DashboardHomeData } from "@/lib/dashboard-home";

type TodayGeneratedSummaryProps = {
  stats: DashboardHomeData["todayGenerated"];
};

const statItems = [
  { key: "productAnalysis", label: "商品分析" },
  { key: "copywriting", label: "文案" },
  { key: "image", label: "图片" },
  { key: "imageEnhance", label: "图片优化" },
  { key: "sceneImage", label: "场景图" },
  { key: "video", label: "视频" },
] as const;

export function TodayGeneratedSummary({ stats }: TodayGeneratedSummaryProps) {
  return (
    <section className="today-generated-card glass-card">
      <div>
        <p className="eyebrow">今日生成</p>
        <h2>{stats.total}</h2>
        <p>今日 AI 能力调用总量</p>
      </div>
      <div className="today-generated-list">
        {statItems.map((item) => (
          <article key={item.key}>
            <span>{item.label}</span>
            <strong>{stats[item.key]}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
