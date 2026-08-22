import Link from "next/link";

export function ProductProjectEmptyState() {
  return (
    <section className="product-project-empty cai-card cai-card--muted" aria-label="商品项目空状态">
      <div className="cai-empty">
        <span className="cai-empty__icon" aria-hidden="true">
          商
        </span>
        <h2 className="cai-empty__title">还没有商品项目</h2>
        <p className="cai-empty__description">把每个商品作为一个独立项目管理，从商品策划到素材包都集中在这里。</p>
        <div className="product-project-empty__flow" aria-label="商品项目流程">
          <span>商品策划</span>
          <span>上架文案</span>
          <span>商品套图</span>
          <span>素材库</span>
          <span>素材包</span>
        </div>
        <div className="cai-empty__actions">
          <Link className="cai-button cai-button--primary" href="/dashboard/products/new">
            新建第一个商品项目
          </Link>
        </div>
      </div>
    </section>
  );
}
