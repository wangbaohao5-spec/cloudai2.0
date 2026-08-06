export type VideoPromptInput = {
  productName: string;
  productDescription: string;
  platform: string;
  videoType: string;
};

const platformGuides: Record<string, string> = {
  douyin: "适合抖音电商，前三秒需要强钩子，节奏快，突出用户痛点、情绪刺激、卖点展示和下单引导。",
  tiktok: "适合 TikTok Shop，使用国际化表达，画面需要快速理解，采用 Hook-Problem-Benefit-CTA 的短视频带货结构。",
  amazon: "适合 Amazon 商品页面，表达专业可信，突出产品功能、使用场景、品质感和购买理由。",
  shopee: "适合 Shopee 跨境电商，移动端友好，卖点直观，强调性价比、场景化展示和快速转化。",
};

const videoTypeGuides: Record<string, string> = {
  productShowcase: "产品展示视频，镜头围绕产品外观、核心功能、细节质感和使用方式展开。",
  shortAd: "短视频广告，开场强吸引，快速制造痛点，突出利益点，并在结尾加入明确行动号召。",
  unboxing: "开箱视频，包含包装展示、开箱过程、第一眼体验、核心配件和使用期待。",
  lifestyle: "生活场景视频，把产品放入真实使用环境，强调用户体验、情绪价值和场景化种草。",
};

export function buildVideoPrompt(data: VideoPromptInput) {
  const platformGuide = platformGuides[data.platform] || "适合通用电商视频内容，突出商品价值和转化路径。";
  const videoTypeGuide = videoTypeGuides[data.videoType] || "电商视频，节奏清晰，突出商品主体和核心卖点。";

  return [
    `商品名称：${data.productName}`,
    `商品描述：${data.productDescription}`,
    videoTypeGuide,
    platformGuide,
    "视频要求：5 秒，横版 1280*720，高清真实商业摄影质感，产品主体清晰，镜头运动自然，包含开场吸引、卖点展示、使用场景和结尾购买引导，不要出现乱码文字、水印或不相关品牌标识。",
  ].join(" ");
}
