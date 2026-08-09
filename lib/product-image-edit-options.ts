export type ProductImageEditGoalId = "main-image" | "detail-image" | "xiaohongshu-seeding" | "ad-visual";

export type ProductImageEditGoalOption = {
  id: ProductImageEditGoalId;
  title: string;
  description: string;
  promptTemplate: string;
};

export const PRODUCT_IMAGE_EDIT_GOALS = [
  {
    id: "main-image",
    title: "电商主图",
    description: "适合淘宝、Amazon 等商品首图，突出主体和专业商业摄影质感。",
    promptTemplate:
      "保持商品主体完全一致，不改变产品结构、颜色、比例。优化为专业商业摄影效果，背景干净，高质量光影，商品主体清晰居中，适合 Amazon、淘宝等商品主图。",
  },
  {
    id: "detail-image",
    title: "商品详情图",
    description: "突出商品材质、结构和功能细节，适合详情页承接转化。",
    promptTemplate: "保持商品真实外观，突出材质、结构、功能细节和使用价值，画面清晰专业，适合商品详情页展示。",
  },
  {
    id: "xiaohongshu-seeding",
    title: "小红书种草图",
    description: "生成自然生活场景，增强使用氛围和内容平台代入感。",
    promptTemplate: "保持商品一致，生成自然生活场景，真实摄影风格，自然光，增强使用氛围和用户代入感，适合小红书种草内容。",
  },
  {
    id: "ad-visual",
    title: "广告视觉图",
    description: "强化视觉冲击和品牌广告质感，适合投放素材和活动视觉。",
    promptTemplate: "保持商品主体真实，增强视觉冲击，生成高级品牌广告摄影效果，构图有记忆点，光影更精致，适合电商广告视觉图。",
  },
] satisfies ProductImageEditGoalOption[];

export function getProductImageEditGoal(goalId: string) {
  return PRODUCT_IMAGE_EDIT_GOALS.find((goal) => goal.id === goalId) || PRODUCT_IMAGE_EDIT_GOALS[0];
}
