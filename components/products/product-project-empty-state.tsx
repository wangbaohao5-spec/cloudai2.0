import Link from "next/link";

export function ProductProjectEmptyState() {
  return (
    <section className="product-project-empty cai-card cai-card--muted" aria-label="全部商品空状态">
      <div className="cai-empty">
        <span className="cai-empty__icon" aria-hidden="true">
          商
        </span>
        <h2 className="cai-empty__title">还没有商品</h2>
        <p className="cai-empty__description">创建第一个商品后，它会出现在这里，方便以后继续创作。</p>
        <div className="product-project-empty__flow" aria-label="商品创作流程">
          <span>商品策划</span>
          <span>上架文案</span>
          <span>商品套图</span>
          <span>素材库</span>
          <span>素材包</span>
        </div>
        <div className="cai-empty__actions">
          <Link className="cai-button cai-button--primary" href="/dashboard/products/new">
            新建商品
          </Link>
        </div>
      </div>
    </section>
  );
}
