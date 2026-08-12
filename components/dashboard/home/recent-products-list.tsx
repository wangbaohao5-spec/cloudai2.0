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
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={product.title} src={product.imageUrl} />
                ) : (
                  <span>暂无图片</span>
                )}
              </div>
              <div>
                <strong>{product.title}</strong>
                <p>{product.category || "商品类别待补充"}</p>
              </div>
              <span>{formatDate(product.updatedAt)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="dashboard-home-empty">
          <p>完成一次商品分析后，最近商品会出现在这里。</p>
        </div>
      )}
    </section>
  );
}
