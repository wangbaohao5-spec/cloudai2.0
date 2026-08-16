"use client";

import { buildImageDownloadFilename, ImageDownloadButton } from "@/components/ui/image-download-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { LongGenerationLoading } from "@/components/ui/loading";
import { ProductGenerationCostHint } from "@/components/products/product-generation-cost-hint";
import type { ProductImageSetPlan, ProductImageSetPlanImage } from "@/lib/ai/product-image-set-plan-prompt-builder";
import { useState } from "react";

type ProductImageSetPlanPreviewProps = {
  generatingImageIndex?: number | null;
  imageErrors?: Record<number, string>;
  imageResults?: Record<number, ProductImageSetImageResult>;
  isGenerationDisabled?: boolean;
  onGenerateImage?: (image: ProductImageSetPlanImage) => void;
  plan: ProductImageSetPlan | null;
};

export type ProductImageSetImageResult = {
  assetId: string;
  historyId?: string;
  image: ProductImageSetPlanImage;
  imageUrl: string;
  prompt: string;
  purpose: ProductImageSetPlan["purpose"];
  status: "success";
  storagePath: string;
  type: "商品套图";
  warnings?: string[];
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

function getImageTypeLabel(imageType: ProductImageSetPlanImage["imageType"]) {
  return IMAGE_TYPE_LABELS[imageType] || "商品图";
}

export function ProductImageSetPlanPreview({
  generatingImageIndex = null,
  imageErrors = {},
  imageResults = {},
  isGenerationDisabled = false,
  onGenerateImage,
  plan,
}: ProductImageSetPlanPreviewProps) {
  const [lightboxImage, setLightboxImage] = useState<{ alt: string; title: string; url: string } | null>(null);

  if (!plan?.images.length) {
    return null;
  }

  return (
    <div className="product-image-set-plan-preview" aria-label="商品套图规划预览">
      {plan.images.map((image) => {
        const isGenerating = generatingImageIndex === image.imageIndex;
        const result = imageResults[image.imageIndex];
        const error = imageErrors[image.imageIndex];
        const imageTypeLabel = getImageTypeLabel(image.imageType);

        return (
          <article className="product-image-set-plan-card" key={`${image.imageIndex}-${image.title}`}>
            <div className="product-image-set-plan-card-header">
              <span>第 {image.imageIndex} 张</span>
              <em>{imageTypeLabel}</em>
              <i>{image.suggestedGenerationMode === "creative" ? "创意" : "保真"}</i>
            </div>

            <div className={`product-image-set-card__media product-image-set-card-media ${result ? "has-image" : "is-placeholder"}`}>
              <span className="product-image-set-card__badge product-image-set-card-badge">{imageTypeLabel}</span>
              {result ? (
                <>
                  <button
                    className="product-image-preview-button"
                    type="button"
                    aria-label={`放大查看第 ${image.imageIndex} 张套图生成结果`}
                    onClick={() =>
                      setLightboxImage({
                        alt: `第 ${image.imageIndex} 张套图生成结果`,
                        title: `第 ${image.imageIndex} 张套图 · ${image.title}`,
                        url: result.imageUrl,
                      })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={`第 ${image.imageIndex} 张套图生成结果`} decoding="async" loading="lazy" src={result.imageUrl} />
                  </button>
                  <div className="product-image-set-card__download product-image-set-card-download" onClick={(event) => event.stopPropagation()}>
                    <ImageDownloadButton
                      className="product-image-set-card__download-button product-image-set-card-download-button"
                      filename={buildImageDownloadFilename("image-set", [String(image.imageIndex).padStart(2, "0"), image.imageType])}
                      imageUrl={result.imageUrl}
                      label="下载"
                    />
                  </div>
                </>
              ) : (
                <div className="product-image-set-card__placeholder product-image-set-card-placeholder">
                  {isGenerating ? <LongGenerationLoading size="md" /> : <span>{String(image.imageIndex).padStart(2, "0")}</span>}
                  <strong>{isGenerating ? "正在生成这张图..." : imageTypeLabel}</strong>
                  <p>{image.visualDirection || image.goal || "生成后将在这里显示图片预览。"}</p>
                </div>
              )}
            </div>

            <div className="product-image-set-card__body product-image-set-card-body">
              <h3>{image.title}</h3>
              <p>{image.keyMessage || image.headline || image.goal || "暂无核心信息"}</p>
            </div>

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

            {error ? <p className="image-generation-error">{error}</p> : null}

            <div className="product-image-set-plan-footer">
              <ProductGenerationCostHint compact label="生成这张套图将消耗 1 张图片额度" description="生成前请确认画面建议、必须保留和避免改动内容。" />
              <span>{image.suggestedGenerationMode === "creative" ? "推荐：营销创意" : "推荐：保真优化"}</span>
              <button className="button secondary" type="button" disabled={isGenerating || isGenerationDisabled} onClick={() => onGenerateImage?.(image)}>
                {isGenerating ? (
                  <>
                    <LongGenerationLoading size="sm" />
                    正在生成...
                  </>
                ) : result ? (
                  "重新生成这张图"
                ) : (
                  "生成这张图"
                )}
              </button>
            </div>
          </article>
        );
      })}
      {lightboxImage ? (
        <ImageLightbox alt={lightboxImage.alt} imageUrl={lightboxImage.url} title={lightboxImage.title} onClose={() => setLightboxImage(null)} />
      ) : null}
    </div>
  );
}
