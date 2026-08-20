import type { ProductHomeCard } from "@/lib/dashboard-home";
import Link from "next/link";

type ContinueProductCardProps = {
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

export function ContinueProductCard({ product }: ContinueProductCardProps) {
  if (!product) {
    return (
      <section className="continue-product-card glass-card">
        <div className="dashboard-home-empty">
          <p className="eyebrow">继续创作</p>
          <h2>还没有商品项目</h2>
          <p>上传一张商品图，CloudAI 会从商品策划、上架文案、原图优化到商品套图和素材包帮你搭好商品创作工作台。</p>
          <Link className="button primary" href="/dashboard/products">
            进入商品工作台
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="continue-product-card glass-card">
      <div className="continue-product-media">
        {product.previewUrl || product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={product.title} decoding="async" src={product.previewUrl || product.imageUrl || ""} />
        ) : (
          <span>暂无图片</span>
        )}
      </div>
      <div className="continue-product-body">
        <p className="eyebrow">继续上次商品</p>
        <h2>{product.title}</h2>
        <div className="continue-product-meta">
          <span>{product.category || "商品类别待补充"}</span>
          <span>{product.targetAudience || "目标用户待补充"}</span>
          <span>上次更新 {formatDate(product.updatedAt)}</span>
        </div>
        <Link className="button primary" href={`/dashboard/products?analysis=${product.analysisHistoryId}`}>
          继续创作
        </Link>
      </div>
    </section>
  );
}
