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
    <section className="dashboard-home-section glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">最近商品</p>
          <h2>继续最近分析过的商品</h2>
        </div>
        <span>{products.length ? `${products.length} 个商品` : "暂无商品"}</span>
      </div>

      {products.length ? (
        <div className="recent-products-grid">
          {products.map((product) => (
            <Link className="recent-product-card" href={`/dashboard/products?analysis=${product.analysisHistoryId}`} key={product.analysisHistoryId}>
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
              </div>
              <div className="recent-product-footer">
                <span>上次更新 {formatDate(product.updatedAt)}</span>
                <em>继续创作</em>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="dashboard-home-empty">
          <p>完成一次商品分析后，最近商品会出现在这里，方便你继续生成文案、图片和素材包。</p>
          <Link className="button primary" href="/dashboard/products">
            进入商品工作台
          </Link>
        </div>
      )}
    </section>
  );
}
