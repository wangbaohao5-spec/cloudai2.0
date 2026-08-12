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
          <p>上传一张商品图，CloudAI 会从分析、文案、图片到场景图帮你搭好创作工作台。</p>
          <Link className="button primary" href="/dashboard/products">
            上传新商品
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="continue-product-card glass-card">
      <div className="continue-product-media">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={product.title} src={product.imageUrl} />
        ) : (
          <span>暂无图片</span>
        )}
      </div>
      <div className="continue-product-body">
        <p className="eyebrow">继续创作</p>
        <h2>{product.title}</h2>
        <div className="continue-product-meta">
          <span>{product.category || "商品类别待补充"}</span>
          <span>{product.targetAudience || "目标用户待补充"}</span>
          <span>{formatDate(product.updatedAt)}</span>
        </div>
        <Link className="button primary" href={`/dashboard/products?analysis=${product.analysisHistoryId}`}>
          继续创作
        </Link>
      </div>
    </section>
  );
}
