import type { PromptTemplate } from "@/lib/types";

const supportedCopywritingPlatforms = ["taobao", "pinduoduo", "shopee", "amazon", "douyin", "tiktok"];

export const platformPromptGuides: Record<string, string> = {
  taobao: "淘宝平台：突出搜索关键词、商品利益点、详情页转化表达，语气可信、完整，适合国内消费者快速理解价值。",
  pinduoduo: "拼多多平台：强调高性价比、实惠、限时优惠、日常刚需和下单理由，文案要直接、有促销感。",
  shopee: "Shopee 平台：面向跨境东南亚电商场景，表达要简洁清晰，突出核心卖点、使用场景和轻快购买理由。",
  amazon: "Amazon 平台：面向海外用户，语气专业可信，突出功能参数、使用体验、品质感和合规清晰的 Bullet Points。",
  douyin: "抖音电商平台：偏短视频和直播带货场景，前三秒必须抓住注意力；突出用户痛点、情绪刺激、强转化理由和口播节奏。标题更偏点击率和转化，shortVideoScript 必须包含短视频开场钩子、痛点放大、卖点展示、下单引导。",
  tiktok: "TikTok Shop 平台：面向海外短视频电商，优先支持英文表达；强调视觉吸引、快速理解、本地化营销语言和 TikTok 视频带货脚本结构。shortVideoScript 应包含 Hook、Problem、Benefit、Social Proof、CTA，并保留未来多语言扩展的表达空间。",
};

export const promptTemplates: PromptTemplate[] = [
  {
    id: "product-title-optimization",
    name: "商品标题优化",
    description: "生成适合平台搜索、点击和转化的商品标题。",
    platform: supportedCopywritingPlatforms,
    outputType: "title",
    prompt: "重点优化 title 字段：标题需要清晰呈现商品关键词、核心卖点和平台转化风格。其他字段仍需补全，但应服务于标题方向。",
  },
  {
    id: "product-selling-points",
    name: "商品卖点提炼",
    description: "提炼 3 条高转化商品卖点。",
    platform: supportedCopywritingPlatforms,
    outputType: "selling-points",
    prompt: "重点优化 points 字段：提炼 3 条差异化、可感知、适合平台语境的核心卖点。其他字段仍需补全，但应围绕卖点展开。",
  },
  {
    id: "product-detail-description",
    name: "商品详情描述",
    description: "生成适合详情页或商品页的完整描述。",
    platform: supportedCopywritingPlatforms,
    outputType: "description",
    prompt: "重点优化 description 字段：描述需要包含使用场景、核心利益点、购买理由和平台适配表达。其他字段仍需补全，但应支持详情页转化。",
  },
  {
    id: "short-video-selling-script",
    name: "短视频带货脚本",
    description: "生成短视频或直播带货口播脚本。",
    platform: supportedCopywritingPlatforms,
    outputType: "short-video-script",
    prompt: "重点优化 shortVideoScript 字段：脚本需要包含开场钩子、痛点、卖点展示、场景化表达和行动号召。其他字段仍需补全，但应服务于视频转化。",
  },
  {
    id: "advertising-promotion-copy",
    name: "广告推广文案",
    description: "生成适合投放、站内推广和短视频广告的转化文案。",
    platform: supportedCopywritingPlatforms,
    outputType: "ad-copy",
    prompt: "重点生成广告推广文案：title 需要具备点击吸引力，points 需要呈现 3 条广告利益点，description 需要像广告正文一样突出痛点、利益、信任和行动号召，shortVideoScript 可作为广告短视频口播脚本补充。",
  },
  {
    id: "one-click-marketing-plan",
    name: "一键生成营销方案",
    description: "根据平台、商品信息和目标组合生成标题、卖点、详情、短视频脚本和广告方向。",
    platform: supportedCopywritingPlatforms,
    outputType: "marketing-plan",
    prompt: "生成完整营销方案：综合优化 title、points、description、shortVideoScript；内容需要体现平台特征、商品目标、用户痛点、转化路径和可直接使用的带货表达。",
  },
];

export function getPlatformPromptGuide(platform: string) {
  return platformPromptGuides[platform] || "通用电商平台：突出商品核心卖点、使用场景和购买理由。";
}

export function getPromptTemplate(platform: string, outputType: string) {
  return (
    promptTemplates.find((template) => template.outputType === outputType && template.platform.includes(platform)) ||
    promptTemplates.find((template) => template.outputType === outputType) ||
    promptTemplates[0]
  );
}

export function getPromptTemplates(platform: string, outputTypes: string[]) {
  return outputTypes.map((outputType) => getPromptTemplate(platform, outputType));
}
