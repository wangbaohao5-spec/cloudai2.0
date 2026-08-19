import {
  formatProductOutputSettingsSummary,
  getProductOutputSettingsLabel,
  sanitizeProductOutputSettings,
} from "@/lib/product-output-settings";
import type { ProductOutputSettings } from "@/lib/product-types";

const PLATFORM_RULES: Record<string, string> = {
  amazon: "Amazon：适合白底图、多角度图、参数图、对比图和清晰 Listing 信息。",
  douyin: "抖音电商：适合更直接的卖点、人物场景和强吸引力短句。",
  general: "通用电商：适合清楚表达商品主体、核心卖点和可复用素材。",
  "independent-site": "独立站：适合品牌感、简洁视觉和高质量商品展示。",
  jd: "京东：适合主图、卖点图、细节图、参数图，信息清楚可信。",
  pinduoduo: "拼多多：适合直接、实用、移动端快速理解的商品表达。",
  shopee: "Shopee：适合白底图、多角度图、参数图、对比图和清晰 Listing 信息。",
  taobao: "淘宝：适合主图、卖点图、细节图、参数图，电商信息清楚。",
  "tiktok-shop": "TikTok Shop：适合更直接的卖点、人物场景和强吸引力短句。",
  xiaohongshu: "小红书：适合生活方式、种草感、轻文案和场景化表达。",
};

const LANGUAGE_RULES: Record<string, string> = {
  "zh-CN": "zh-CN：使用简体中文。",
  en: "en：使用自然英文，不要夹杂中文。",
  ja: "ja：使用自然日文，不要夹杂中文。",
};

const RATIO_RULES: Record<string, string> = {
  "1:1": "1:1：适合通用商品主图和平台方图。",
  "3:4": "3:4：适合详情图和商品展示。",
  "4:5": "4:5：适合信息流、种草图和竖向商品展示。",
  "16:9": "16:9：适合横版海报、封面或视频预览。",
};

export function buildProductOutputSettingsPrompt(outputSettings?: ProductOutputSettings | null) {
  const settings = sanitizeProductOutputSettings(outputSettings);

  if (!settings) {
    return "";
  }

  // Future: when outputLanguage is not zh-CN, route through MULTILINGUAL_TEXT_PROVIDER / MULTILINGUAL_TEXT_MODEL if needed.
  return [
    "当前商品内容的输出设置：",
    `- 目标平台：${getProductOutputSettingsLabel(settings, "targetPlatform")}`,
    `- 目标市场：${getProductOutputSettingsLabel(settings, "targetMarket")}`,
    `- 输出语言：${getProductOutputSettingsLabel(settings, "outputLanguage")}`,
    `- 图片比例：${getProductOutputSettingsLabel(settings, "outputRatio")}`,
    `设置摘要：${formatProductOutputSettingsSummary(settings)}`,
    "",
    "请根据目标平台、市场、语言和比例调整文案语气、图片结构、画面比例和图中文字密度。",
    "平台规则：",
    PLATFORM_RULES[settings.targetPlatform],
    "语言规则：",
    LANGUAGE_RULES[settings.outputLanguage],
    "比例规则：",
    RATIO_RULES[settings.outputRatio],
    "输出设置只是发布目标和格式约束，不得覆盖用户保存的生成要求、风险规则和商品保真规则。",
  ]
    .filter(Boolean)
    .join("\n");
}
