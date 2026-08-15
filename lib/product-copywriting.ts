import type { ProductImageAnalysis } from "@/lib/product-types";
import type { CopywritingFormData } from "@/lib/types";

export type ProductCopywritingOptions = {
  platform?: string;
  tone?: string;
  goal?: string;
  outputType?: string;
  outputTypes?: string[];
  generationMode?: "single" | "marketing-plan";
};

export function isProductImageAnalysis(value: unknown): value is ProductImageAnalysis {
  if (!value || typeof value !== "object") {
    return false;
  }

  const analysis = value as Partial<ProductImageAnalysis>;

  return typeof analysis.category === "string" || Array.isArray(analysis.productNameSuggestions) || Array.isArray(analysis.sellingPoints);
}

function joinAnalysisItems(...groups: Array<string[] | string | undefined>) {
  return groups
    .flatMap((group) => {
      if (!group) {
        return [];
      }

      return Array.isArray(group) ? group : [group];
    })
    .map((item) => item.trim())
    .filter(Boolean)
    .join("；");
}

export function buildCopywritingDataFromAnalysis(analysis: ProductImageAnalysis, options: ProductCopywritingOptions = {}): CopywritingFormData {
  const generationMode = options.generationMode || "marketing-plan";
  const outputTypes = options.outputTypes?.length
    ? options.outputTypes
    : ["title", "selling-points", "description", "short-video-script", "ad-copy"];

  return {
    productName: analysis.productNameSuggestions[0] || analysis.category || "商品",
    productType: analysis.category || "商品",
    sellingPoints:
      joinAnalysisItems(
        analysis.sellingPoints,
        analysis.features,
        analysis.targetAudience ? `目标用户：${analysis.targetAudience}` : undefined,
        analysis.scenes?.length ? `使用场景：${analysis.scenes.join("、")}` : undefined,
        analysis.visualStyle ? `视觉风格：${analysis.visualStyle}` : undefined,
        [analysis.material, analysis.color, ...(analysis.materials || []), ...(analysis.colors || [])].filter(Boolean).length
          ? `材质颜色：${[analysis.material, analysis.color, ...(analysis.materials || []), ...(analysis.colors || [])].filter(Boolean).join(" / ")}`
          : undefined,
        analysis.specifications?.length ? `规格：${analysis.specifications.join("、")}` : undefined,
        analysis.capacity ? `容量：${analysis.capacity}` : undefined,
        analysis.variants?.length ? `款式：${analysis.variants.join("、")}` : undefined,
        analysis.mustKeepDetails?.length ? `必须保留：${analysis.mustKeepDetails.join("、")}` : undefined,
        analysis.avoidChanges?.length ? `避免改动：${analysis.avoidChanges.join("、")}` : undefined,
      ) || "基于商品图片分析结果提炼卖点",
    platform: options.platform || "taobao",
    tone: options.tone || "professional",
    outputType: generationMode === "marketing-plan" ? "marketing-plan" : options.outputType || outputTypes[0] || "title",
    goal: options.goal || "conversion",
    outputTypes,
    generationMode,
  };
}
