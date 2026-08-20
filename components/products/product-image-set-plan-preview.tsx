"use client";

import { buildImageDownloadFilename, ImageDownloadButton } from "@/components/ui/image-download-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { LongGenerationLoading } from "@/components/ui/loading";
import { ProductGenerationCostHint } from "@/components/products/product-generation-cost-hint";
import type { ProductImageSetPlan, ProductImageSetPlanImage } from "@/lib/ai/product-image-set-plan-prompt-builder";
import type { ReactNode } from "react";
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

const CHIP_LIMIT = 5;
const HERO_COPY_RISK_KEYWORDS = ["官方", "授权", "正品", "第一", "最好", "100%", "永久", "认证", "保证", "功效", "无副作用", "品牌"];

function getNonEmptyItems(items: Array<string | undefined>) {
  return items.map((item) => item?.trim() || "").filter(Boolean);
}

function getLimitedItems(items: string[], limit = CHIP_LIMIT) {
  return {
    hiddenCount: Math.max(items.length - limit, 0),
    visibleItems: items.slice(0, limit),
  };
}

function ImageSetCardSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="product-image-set-card-section">
      <strong>{title}</strong>
      {children}
    </section>
  );
}

function ImageSetChipList({ items }: { items: string[] }) {
  const { hiddenCount, visibleItems } = getLimitedItems(items);

  if (!items.length) {
    return null;
  }

  return (
    <div className="product-image-set-chip-list">
      {visibleItems.map((item, index) => (
        <span className="product-image-set-chip" key={`${item}-${index}`}>
          {item}
        </span>
      ))}
      {hiddenCount ? <span className="product-image-set-chip product-image-set-chip-more">+{hiddenCount} 项</span> : null}
    </div>
  );
}

function getImageTypeLabel(imageType: ProductImageSetPlanImage["imageType"]) {
  return IMAGE_TYPE_LABELS[imageType] || "商品图";
}

function hasHeroCopyRisk(image: ProductImageSetPlanImage) {
  const text = [image.title, image.headline, image.keyMessage, image.visualDirection].filter(Boolean).join(" ");

  return HERO_COPY_RISK_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function ProductImageSetPlanPreview({
  generatingImageIndex = null,
  imageErrors = {},
  imageResults = {},
  isGenerationDisabled = false,
  onGenerateImage,
  plan,
}: ProductImageSetPlanPreviewProps) {
  const [expandedImageIndexes, setExpandedImageIndexes] = useState<Set<number>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<{ alt: string; title: string; url: string } | null>(null);

  if (!plan?.images.length) {
    return null;
  }

  function togglePlanDetails(imageIndex: number) {
    setExpandedImageIndexes((current) => {
      const next = new Set(current);

      if (next.has(imageIndex)) {
        next.delete(imageIndex);
      } else {
        next.add(imageIndex);
      }

      return next;
    });
  }

  return (
    <div className="product-image-set-plan-preview" aria-label="商品套图规划预览">
      {plan.images.map((image) => {
        const isGenerating = generatingImageIndex === image.imageIndex;
        const result = imageResults[image.imageIndex];
        const error = imageErrors[image.imageIndex];
        const imageTypeLabel = getImageTypeLabel(image.imageType);
        const isHeroClickImage = image.imageIndex === 1;
        const displayTypeLabel = isHeroClickImage ? "主图点击图" : imageTypeLabel;
        const hasHeroRiskNotice = isHeroClickImage && hasHeroCopyRisk(image);
        const coreCopyItems = getNonEmptyItems([image.headline, image.subheadline, image.keyMessage]);
        const keepItems = getNonEmptyItems([...image.requiredElements, ...image.mustKeep]);
        const avoidItems = getNonEmptyItems(image.avoid);
        const modeLabel = image.suggestedGenerationMode === "creative" ? "营销创意" : "保真优化";
        const isDetailOpen = expandedImageIndexes.has(image.imageIndex);

        return (
          <article className={`product-image-set-plan-card ${result ? "has-result" : "is-task"}`} key={`${image.imageIndex}-${image.title}`}>
            <div className="product-image-set-card-header product-image-set-plan-card-header">
              <div className="product-image-set-card-kicker">
                <span className="product-image-set-type-badge">
                  第 {image.imageIndex} 张 · {displayTypeLabel}
                </span>
                {isHeroClickImage ? <i className="product-image-set-hero-badge">首屏主视觉</i> : null}
                <i className="product-image-set-mode-badge">{modeLabel}</i>
              </div>
            </div>

            <div className={`product-image-set-card__media product-image-set-card-media ${result ? "has-image" : "is-placeholder"}`}>
              <span className="product-image-set-card__badge product-image-set-card-badge">{displayTypeLabel}</span>
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
                  <strong>{isGenerating ? `正在生成第 ${image.imageIndex} 张...` : displayTypeLabel}</strong>
                  <p>{image.visualDirection || image.goal || "生成后将在这里显示图片预览。"}</p>
                </div>
              )}
            </div>

            <div className="product-image-set-card__body product-image-set-card-body">
              <h3>{image.title}</h3>
              {isHeroClickImage ? <p className="product-image-set-hero-note">这张图负责吸引点击，展示商品最核心的卖点。</p> : null}
              {hasHeroRiskNotice ? (
                <p className="product-image-set-hero-risk-note">主图文案可能包含需确认表述，请生成前检查。</p>
              ) : null}
              <p className="product-image-set-card-summary">
                {result ? image.keyMessage || image.headline || "当前显示最近一次生成结果。" : image.goal || image.keyMessage || "暂无任务说明"}
              </p>
              <button className="product-image-set-details-toggle" type="button" onClick={() => togglePlanDetails(image.imageIndex)}>
                {isDetailOpen ? "收起详情" : "查看规划详情"}
              </button>
            </div>

            {isDetailOpen ? (
              <div className="product-image-set-card-sections">
                {image.goal ? (
                  <ImageSetCardSection title="这张图的任务">
                    <p>{image.goal}</p>
                  </ImageSetCardSection>
                ) : null}
                {coreCopyItems.length ? (
                  <ImageSetCardSection title="核心文案">
                    <div className="product-image-set-copy-stack">
                      {coreCopyItems.map((item, index) => (
                        <p key={`${item}-${index}`}>{item}</p>
                      ))}
                    </div>
                  </ImageSetCardSection>
                ) : null}
                {image.visualDirection ? (
                  <ImageSetCardSection title="画面建议">
                    <p>{image.visualDirection}</p>
                  </ImageSetCardSection>
                ) : null}
                {keepItems.length ? (
                  <ImageSetCardSection title="必须保留">
                    <ImageSetChipList items={keepItems} />
                  </ImageSetCardSection>
                ) : null}
                {avoidItems.length ? (
                  <ImageSetCardSection title="避免改动">
                    <ImageSetChipList items={avoidItems} />
                  </ImageSetCardSection>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <div className="product-image-set-card-error" role="status">
                <strong>{result ? "重新生成失败" : "生成失败"}</strong>
                <p>失败原因：{error}</p>
              </div>
            ) : null}

            <div className="product-image-set-plan-footer">
              {hasHeroRiskNotice ? <p className="product-image-set-hero-generate-note">建议先确认主图文字是否可用于上架。</p> : null}
              <ProductGenerationCostHint
                compact
                type="image-set"
                label="生成这张图预计消耗 1 张图片额度"
                description="实际记录以额度中心为准。"
              />
              <span>{image.suggestedGenerationMode === "creative" ? "推荐：营销创意" : "推荐：保真优化"}</span>
              <button className="button secondary" type="button" disabled={isGenerating || isGenerationDisabled} onClick={() => onGenerateImage?.(image)}>
                {isGenerating ? (
                  <>
                    <LongGenerationLoading size="sm" />
                    正在生成...
                  </>
                ) : result ? (
                  "重新生成这张图"
                ) : error ? (
                  "重试这张图"
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
