import type { ProductHomeCard } from "@/lib/dashboard-home";
import Link from "next/link";

type RecentProductsListProps = {
  products: ProductHomeCard[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

export function RecentProductsList({ products }: RecentProductsListProps) {
  return (
    <section className="dashboard-home-section dashboard-recent-products cai-panel">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Recent Products</p>
          <h2>最近商品项目</h2>
        </div>
        <Link className="dashboard-section-link" href="/dashboard/products">
          {products.length ? `查看全部 ${products.length} 个` : "查看商品项目"}
        </Link>
      </div>

      {products.length ? (
        <div className="recent-products-grid">
          {products.map((product) => (
            <Link className="recent-product-card cai-card cai-card--compact cai-card--interactive" href={`/dashboard/products?analysis=${product.analysisHistoryId}`} key={product.analysisHistoryId}>
              <div className="recent-product-media">
                {product.previewUrl || product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={product.title} decoding="async" loading="lazy" src={product.previewUrl || product.imageUrl || ""} />
                ) : (
                  <span>暂无图片</span>
                )}
              </div>
              <div className="recent-product-content">
                <strong>{product.title}</strong>
                <p>{product.category || "商品类别待补充"}</p>
                <span>{product.statusSummary}</span>
              </div>
              <div className="recent-product-footer">
                <span>上次更新 {formatDate(product.updatedAt)}</span>
                <em>继续创作</em>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="dashboard-home-empty cai-empty">
          <span className="cai-empty__icon" aria-hidden="true">
            商
          </span>
          <h3 className="cai-empty__title">还没有商品项目</h3>
          <p className="cai-empty__description">上传第一张商品图开始创作，最近分析过的商品会出现在这里。</p>
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
