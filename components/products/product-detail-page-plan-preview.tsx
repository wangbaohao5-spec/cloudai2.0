import type { ProductDetailPagePlanPage } from "@/lib/ai/product-detail-page-plan-prompt-builder";

type ProductDetailPagePlanPreviewProps = {
  pages: ProductDetailPagePlanPage[];
};

const SECTION_TYPE_LABELS = {
  cta: "购买理由",
  feature: "核心内容",
  hero: "首屏卖点",
} satisfies Record<ProductDetailPagePlanPage["sectionType"], string>;

export function ProductDetailPagePlanPreview({ pages }: ProductDetailPagePlanPreviewProps) {
  if (!pages.length) {
    return null;
  }

  return (
    <div className="product-detail-plan-preview" aria-label="商品详情页规划预览">
      {pages.map((page) => (
        <article className="product-detail-plan-card" key={`${page.pageIndex}-${page.sectionTitle}`}>
          <div className="product-detail-plan-card-header">
            <span>第 {page.pageIndex} 张</span>
            <em>{SECTION_TYPE_LABELS[page.sectionType]}</em>
          </div>
          <h3>{page.sectionTitle}</h3>
          <dl>
            <div>
              <dt>标题</dt>
              <dd>{page.headline || "暂无"}</dd>
            </div>
            <div>
              <dt>副标题</dt>
              <dd>{page.subheadline || "暂无"}</dd>
            </div>
            <div>
              <dt>核心卖点</dt>
              <dd>{page.sellingPoint || "暂无"}</dd>
            </div>
            <div>
              <dt>画面建议</dt>
              <dd>{page.visualDirection || "暂无"}</dd>
            </div>
            <div>
              <dt>文案建议</dt>
              <dd>{page.bodyCopy || "暂无"}</dd>
            </div>
          </dl>
          {page.notes ? <p>{page.notes}</p> : null}
        </article>
      ))}
    </div>
  );
}
