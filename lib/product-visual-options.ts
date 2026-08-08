export type ProductVisualSceneOption = {
  id: string;
  name: string;
  description: string;
};

export const PRODUCT_VISUAL_SCENES = [
  {
    id: "lifestyle",
    name: "生活方式场景",
    description: "把商品放进真实使用环境，突出用户代入感和日常使用价值。",
  },
  {
    id: "premium-ad",
    name: "高级广告视觉",
    description: "强调质感、灯光和品牌感，适合高端营销素材。",
  },
  {
    id: "social-content",
    name: "社交媒体种草",
    description: "适合短视频封面和社交平台内容，强调吸引力和分享感。",
  },
  {
    id: "detail-benefit",
    name: "卖点细节展示",
    description: "围绕核心功能和利益点构图，适合详情页和转化素材。",
  },
] satisfies ProductVisualSceneOption[];

export function getProductVisualSceneOption(sceneId: string) {
  return PRODUCT_VISUAL_SCENES.find((scene) => scene.id === sceneId);
}
