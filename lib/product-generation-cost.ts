export type ProductGenerationCostEstimate = {
  imageCount: number;
  label: string;
  description: string;
};

export function getSingleImageCostEstimate(label = "预计消耗 1 张图片额度"): ProductGenerationCostEstimate {
  return {
    imageCount: 1,
    label,
    description: "图片生成属于高成本任务，生成前请确认商品信息、保真模式和生成要求。",
  };
}

export function getImageSetCostEstimate(count: number): ProductGenerationCostEstimate {
  const imageCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;

  return {
    imageCount,
    label: `预计消耗 ${imageCount} 张图片额度`,
    description: "套图会逐张生成，后续支持部分成功和单张重试。",
  };
}
