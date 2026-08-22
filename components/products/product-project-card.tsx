import type { ProductProjectListItem } from "@/lib/product-projects";
import Link from "next/link";

type ProductProjectCardProps = {
  project: ProductProjectListItem;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function getProjectHref(analysisHistoryId: string) {
  return `/dashboard/products?analysis=${encodeURIComponent(analysisHistoryId)}`;
}

export function ProductProjectCard({ project }: ProductProjectCardProps) {
  const helperStats = [
    project.imageSetCount > 0 ? `套图 ${project.imageSetCount} 张` : "",
    project.detailPageCount > 0 ? `详情页 ${project.detailPageCount} 张` : "",
    project.imageEditCount > 0 ? `原图优化 ${project.imageEditCount} 张` : "",
  ].filter(Boolean);

  return (
    <Link className="product-project-card cai-card cai-card--interactive" href={getProjectHref(project.analysisHistoryId)}>
      <div className="product-project-card__media">
        {project.previewUrl || project.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={project.title} decoding="async" loading="lazy" src={project.previewUrl || project.imageUrl || ""} />
        ) : (
          <span>暂无图片</span>
        )}
      </div>

      <div className="product-project-card__body">
        <div className="product-project-card__title-row">
          <h2>{project.title}</h2>
          <span className={`cai-badge cai-badge--${project.status === "planned" ? "neutral" : project.status === "creating" ? "info" : "success"}`}>{project.statusLabel}</span>
        </div>

        <div className="product-project-card__meta">
          {project.category ? <span>{project.category}</span> : null}
          <span>{project.outputSettingsSummary || "未设置发布目标"}</span>
        </div>

        <div className="product-project-card__stats" aria-label="项目素材概览">
          <span>素材 {project.totalAssetCount} 项</span>
          <span>文案 {project.copywritingCount} 组</span>
          {helperStats.slice(0, 2).map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>
      </div>

      <div className="product-project-card__footer">
        <span>最近更新 {formatDate(project.updatedAt)}</span>
        <em>继续创作</em>
      </div>
    </Link>
  );
}
