"use client";

import type { ProductImageSetPlan, ProductImageSetPlanImage } from "@/lib/ai/product-image-set-plan-prompt-builder";

type ProductImageSetPlanPreviewProps = {
  plan: ProductImageSetPlan | null;
};

const IMAGE_TYPE_LABELS: Partial<Record<ProductImageSetPlanImage["imageType"], string>> = {
  "brand-story": "品牌故事图",
  comparison: "对比图",
  cta: "总结 / 购买理由图",
  "detail-closeup": "商品细节图",
  "four-grid-detail": "四宫格细节图",
  hero: "首屏主视觉",
  "model-wearing": "人物 / 模特图",
  "multi-angle": "多角度图",
  "selling-point": "核心卖点图",
  "size-spec": "尺寸 / 参数图",
  "usage-scene": "使用场景图",
  "white-background": "白底主图",
};

function DetailList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p>暂无明确要求</p>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export function ProductImageSetPlanPreview({ plan }: ProductImageSetPlanPreviewProps) {
  if (!plan?.images.length) {
    return null;
  }

  return (
    <div className="product-image-set-plan-preview" aria-label="商品套图规划预览">
      {plan.images.map((image) => (
        <article className="product-image-set-plan-card" key={`${image.imageIndex}-${image.title}`}>
          <div className="product-image-set-plan-card-header">
            <span>第 {image.imageIndex} 张</span>
            <em>{IMAGE_TYPE_LABELS[image.imageType] || image.imageType}</em>
          </div>

          <h3>{image.title}</h3>

          <dl>
            <div>
              <dt>目标</dt>
              <dd>{image.goal || "暂无"}</dd>
            </div>
            <div>
              <dt>核心文案</dt>
              <dd>{image.headline || image.keyMessage || "暂无"}</dd>
            </div>
            <div>
              <dt>副标题</dt>
              <dd>{image.subheadline || "暂无"}</dd>
            </div>
            <div>
              <dt>画面建议</dt>
              <dd>{image.visualDirection || "暂无"}</dd>
            </div>
          </dl>

          <div className="product-image-set-plan-lists">
            <section>
              <strong>必要元素</strong>
              <DetailList items={image.requiredElements} />
            </section>
            <section>
              <strong>必须保留</strong>
              <DetailList items={image.mustKeep} />
            </section>
            <section>
              <strong>避免改动</strong>
              <DetailList items={image.avoid} />
            </section>
          </div>

          <div className="product-image-set-plan-footer">
            <span>{image.suggestedGenerationMode === "creative" ? "推荐：营销创意" : "推荐：保真优化"}</span>
            <button className="button secondary" type="button" disabled>
              后续支持生成
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
