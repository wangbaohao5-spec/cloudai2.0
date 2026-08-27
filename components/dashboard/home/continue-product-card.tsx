import type { ProductHomeCard } from "@/lib/dashboard-home";
import Link from "next/link";

type ContinueProductCardProps = {
  onboarding?: {
    actionLabel: string;
    description: string;
    href: string;
    title: string;
  } | null;
  product: ProductHomeCard | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContinueProductCard({ onboarding = null, product }: ContinueProductCardProps) {
  if (!product) {
    return (
      <section className="continue-product-card continue-product-card-empty cai-card cai-card--muted">
        <div className="dashboard-home-empty cai-empty">
          <span className="cai-empty__icon" aria-hidden="true">
            商
          </span>
          <h2 className="cai-empty__title">{onboarding?.title || "还没有可继续的商品"}</h2>
          <p className="cai-empty__description">{onboarding?.description || "新建商品后，可以从这里继续最近的商品创作。"}</p>
          <div className="dashboard-home-flow">
            <span>上传商品图</span>
            <span>分析商品</span>
            <span>生成上架内容</span>
          </div>
          <Link className="cai-button cai-button--primary" href={onboarding?.href || "/dashboard/products/new"}>
            {onboarding?.actionLabel || "新建商品"}
          </Link>
        </div>
      </section>
    );
  }

  const workspaceHref = `/dashboard/products?analysis=${product.analysisHistoryId}`;
  const secondaryHref = product.assetCount > 0 ? `${workspaceHref}&tab=assets` : `${workspaceHref}&tab=image-set`;

  return (
    <section className="continue-product-card cai-card cai-card--raised">
      <div className="continue-product-media">
        {product.previewUrl || product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={product.title} decoding="async" src={product.previewUrl || product.imageUrl || ""} />
        ) : (
          <span>暂无图片</span>
        )}
      </div>
      <div className="continue-product-body">
        <p className="eyebrow">继续商品创作</p>
        <h2>{product.title}</h2>
        <div className="continue-product-meta">
          <span>{product.category || "商品类别待补充"}</span>
          <span>{product.outputSettingsSummary || "发布目标未记录"}</span>
          <span>上次更新 {formatDate(product.updatedAt)}</span>
        </div>
        <div className="continue-product-status">
          <span>商品策划 已完成</span>
          <span>{product.statusSummary}</span>
          <span>下一步：{product.suggestedAction}</span>
        </div>
        <div className="continue-product-actions">
          <Link className="cai-button cai-button--primary" href={workspaceHref}>
            继续创作
          </Link>
          <Link className="cai-button cai-button--secondary" href={secondaryHref}>
            {product.assetCount > 0 ? "查看素材库" : "继续商品套图"}
          </Link>
        </div>
      </div>
    </section>
  );
}
