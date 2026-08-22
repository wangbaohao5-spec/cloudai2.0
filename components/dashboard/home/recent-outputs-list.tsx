import type { DashboardRecentOutput } from "@/lib/dashboard-home";
import Link from "next/link";

type RecentOutputsListProps = {
  outputs: DashboardRecentOutput[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function getOutputHref(output: DashboardRecentOutput) {
  return output.analysisHistoryId ? `/dashboard/products?analysis=${output.analysisHistoryId}&tab=assets` : "/dashboard/history";
}

export function RecentOutputsList({ outputs }: RecentOutputsListProps) {
  return (
    <section className="dashboard-home-section dashboard-recent-outputs cai-panel">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Recent Outputs</p>
          <h2>最近生成素材</h2>
        </div>
        <span>{outputs.length ? `${outputs.length} 项素材` : "暂无素材"}</span>
      </div>

      {outputs.length ? (
        <div className="recent-outputs-grid">
          {outputs.map((output) => (
            <Link className="recent-output-card cai-gallery-card cai-card--interactive" href={getOutputHref(output)} key={`${output.title}-${output.createdAt}`}>
              <div className="recent-output-media">
                {output.previewUrl || output.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={output.title} decoding="async" loading="lazy" src={output.previewUrl || output.imageUrl || ""} />
                ) : (
                  <span>暂无预览</span>
                )}
              </div>
              <div className="recent-output-content">
                <span className="cai-badge cai-badge--neutral">{output.label}</span>
                <strong>{output.title}</strong>
                <p>{formatDate(output.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="dashboard-home-empty cai-empty">
          <span className="cai-empty__icon" aria-hidden="true">
            素
          </span>
          <h3 className="cai-empty__title">还没有生成素材</h3>
          <p className="cai-empty__description">完成原图优化或商品套图后，最近生成的图片素材会出现在这里。</p>
          <div className="cai-empty__actions">
            <Link className="cai-button cai-button--primary" href="/dashboard/products/new">
              创建商品
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
