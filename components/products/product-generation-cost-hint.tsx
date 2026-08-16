import { getSingleImageCostEstimate } from "@/lib/product-generation-cost";

type ProductGenerationCostHintProps = {
  compact?: boolean;
  description?: string;
  imageCount?: number;
  label?: string;
};

export function ProductGenerationCostHint({ compact = false, description, imageCount = 1, label }: ProductGenerationCostHintProps) {
  const estimate = getSingleImageCostEstimate(label);
  const displayLabel = label || estimate.label;
  const displayDescription =
    description || (imageCount === 1 ? estimate.description : `本次将生成 ${imageCount} 张图片，预计消耗 ${imageCount} 张图片额度。`);

  return (
    <aside className={`product-generation-cost-hint ${compact ? "compact" : ""}`.trim()} aria-label="预计消耗提示">
      <span aria-hidden="true">i</span>
      <div>
        <strong>{displayLabel}</strong>
        {displayDescription ? <p>{displayDescription}</p> : null}
      </div>
    </aside>
  );
}
