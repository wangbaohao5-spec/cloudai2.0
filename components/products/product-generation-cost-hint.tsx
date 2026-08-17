import { getSingleImageCostEstimate, type ProductGenerationCostType } from "@/lib/product-generation-cost";

type ProductGenerationCostHintProps = {
  compact?: boolean;
  description?: string;
  estimatedCost?: number;
  imageCount?: number;
  label?: string;
  remainingQuota?: number | null;
  type?: ProductGenerationCostType;
};

export function ProductGenerationCostHint({
  compact = false,
  description,
  estimatedCost,
  imageCount = 1,
  label,
  remainingQuota = null,
  type = "image",
}: ProductGenerationCostHintProps) {
  const cost = typeof estimatedCost === "number" ? Math.max(estimatedCost, 0) : imageCount;
  const estimate = getSingleImageCostEstimate(label);
  const displayLabel = label || estimate.label;
  const isQuotaKnown = typeof remainingQuota === "number";
  const isInsufficient = isQuotaKnown && cost > remainingQuota;
  const displayDescription =
    description ||
    (cost === 0
      ? "规划阶段只生成结构和文案，不会消耗图片额度。"
      : imageCount === 1
        ? "CloudAI 会尽量避免失败任务消耗额度，实际记录以用量中心为准。"
        : `本次将生成 ${imageCount} 张图片，预计消耗 ${imageCount} 张图片额度。`);
  const quotaText = isQuotaKnown ? `当前剩余：${remainingQuota} 张图片额度` : "";
  const className = [
    "product-generation-cost-hint",
    compact ? "compact" : "",
    cost === 0 ? "is-info" : "",
    isInsufficient ? "is-warning" : "",
    `is-${type}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={className} aria-label="预计消耗提示">
      <span aria-hidden="true">i</span>
      <div>
        <strong>{displayLabel}</strong>
        {displayDescription ? <p>{displayDescription}</p> : null}
        {quotaText ? <p>{quotaText}</p> : null}
        {isInsufficient ? <p className="product-generation-cost-warning">图片额度不足，无法完成本次生成。请前往用量中心查看额度。</p> : null}
      </div>
    </aside>
  );
}
