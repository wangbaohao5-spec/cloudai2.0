import type { ImageGenerationFormData } from "@/lib/types";

const platformGuides: Record<string, string> = {
  taobao: "适合淘宝商品主图和详情页，突出搜索点击率、商品主体、清晰卖点和国内电商转化",
  pinduoduo: "适合拼多多转化场景，突出商品清晰度、实用感、性价比氛围和直接购买动机",
  douyin: "适合抖音电商短视频和直播带货场景，画面需要强吸引力、强情绪触发和快速理解",
  tiktok: "适合 TikTok Shop 海外短视频电商，画面具备国际化视觉吸引力，适合社交传播和快速种草",
  amazon: "适合 Amazon 商品页，突出专业、可信、干净构图、产品细节和海外消费者理解成本",
  shopee: "适合 Shopee 跨境电商，画面清晰、轻快、有购买理由，适合东南亚移动端浏览",
};

const purposeGuides: Record<string, string> = {
  main: "商品主图，白色背景或干净浅色背景，产品居中展示，主体清晰，高清细节，专业商业摄影灯光",
  detail: "详情页图片，展示产品材质、功能细节、使用场景和利益点，构图适合电商详情页阅读",
  ad: "广告素材，强调视觉冲击、转化卖点、强记忆点和广告级构图，适合投放和活动推广",
  social: "社交媒体封面，适合信息流曝光，画面有停留感和分享感，构图适合移动端封面",
};

const styleGuides: Record<string, string> = {
  minimal: "极简高级风格，留白充足，产品居中，干净构图，柔和商业摄影灯光，真实材质，高级品牌视觉",
  tech: "科技产品风格，冷色调，高级光效，精密细节，未来感背景，突出产品功能感",
  lifestyle: "生活场景风格，真实使用环境，自然光，生活方式氛围，强调用户使用场景",
  trendy: "潮流时尚风格，年轻化视觉，鲜明构图，社交媒体审美，强视觉吸引力",
  brand: "品牌广告风格，高端商业广告质感，品牌视觉调性，强构图，适合营销活动传播",
};

export function buildImagePrompt(data: ImageGenerationFormData) {
  const platformGuide = platformGuides[data.platform] || "适合通用电商平台，突出商品主体、核心卖点和商业转化";
  const purposeGuide = purposeGuides[data.purpose] || "电商图片，主体清晰，构图专业，适合商品转化";
  const styleGuide = styleGuides[data.style] || "高质量电商产品摄影，高清细节，画面干净";

  return [
    "高质量电商产品摄影",
    data.product,
    purposeGuide,
    platformGuide,
    styleGuide,
    "真实材质，高清细节，商业摄影灯光，产品主体突出，无文字，无水印，无 logo，画面整洁，适合电商视觉使用",
  ].join("，");
}
