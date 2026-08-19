import type { ProductOutputSettings } from "@/lib/product-types";

export const DEFAULT_PRODUCT_OUTPUT_SETTINGS: ProductOutputSettings = {
  targetPlatform: "taobao",
  targetMarket: "china",
  outputLanguage: "zh-CN",
  outputRatio: "1:1",
};

export const PRODUCT_OUTPUT_PLATFORM_OPTIONS = [
  { value: "general", label: "通用电商" },
  { value: "taobao", label: "淘宝" },
  { value: "douyin", label: "抖音电商" },
  { value: "xiaohongshu", label: "小红书" },
  { value: "jd", label: "京东" },
  { value: "pinduoduo", label: "拼多多" },
  { value: "amazon", label: "Amazon" },
  { value: "shopee", label: "Shopee" },
  { value: "tiktok-shop", label: "TikTok Shop" },
  { value: "independent-site", label: "独立站" },
] as const;

export const PRODUCT_OUTPUT_MARKET_OPTIONS = [
  { value: "china", label: "中国" },
  { value: "north-america", label: "北美" },
  { value: "europe", label: "欧洲" },
  { value: "japan", label: "日本" },
  { value: "southeast-asia", label: "东南亚" },
  { value: "global", label: "全球" },
] as const;

export const PRODUCT_OUTPUT_LANGUAGE_OPTIONS = [
  { value: "zh-CN", label: "中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
] as const;

export const PRODUCT_OUTPUT_RATIO_OPTIONS = [
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
] as const;

const summaryLabels: Record<keyof ProductOutputSettings, Record<string, string>> = {
  targetPlatform: {
    amazon: "Amazon",
    douyin: "抖音电商",
    general: "通用电商",
    "independent-site": "独立站",
    jd: "京东",
    pinduoduo: "拼多多",
    shopee: "Shopee",
    taobao: "淘宝平台",
    "tiktok-shop": "TikTok Shop",
    xiaohongshu: "小红书",
  },
  targetMarket: {
    china: "中国市场",
    europe: "欧洲市场",
    global: "全球市场",
    japan: "日本市场",
    "north-america": "北美市场",
    "southeast-asia": "东南亚市场",
  },
  outputLanguage: {
    "zh-CN": "中文输出",
    en: "英文输出",
    ja: "日文输出",
  },
  outputRatio: {
    "1:1": "1:1 方图",
    "3:4": "3:4 商品图",
    "4:5": "4:5 竖图",
    "16:9": "16:9 横图",
  },
};

const optionValues = {
  targetPlatform: PRODUCT_OUTPUT_PLATFORM_OPTIONS.map((option) => option.value),
  targetMarket: PRODUCT_OUTPUT_MARKET_OPTIONS.map((option) => option.value),
  outputLanguage: PRODUCT_OUTPUT_LANGUAGE_OPTIONS.map((option) => option.value),
  outputRatio: PRODUCT_OUTPUT_RATIO_OPTIONS.map((option) => option.value),
} satisfies Record<keyof ProductOutputSettings, readonly string[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function sanitizeOption(value: unknown, key: keyof ProductOutputSettings) {
  const text = typeof value === "string" ? value.trim() : "";

  return (optionValues[key] as readonly string[]).includes(text) ? text : DEFAULT_PRODUCT_OUTPUT_SETTINGS[key];
}

export function getProductOutputSettingsSessionKey(analysisHistoryId?: string) {
  return analysisHistoryId ? `cloudai:products:output-settings:${analysisHistoryId}` : "";
}

export function sanitizeProductOutputSettings(value: unknown): ProductOutputSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    targetPlatform: sanitizeOption(value.targetPlatform, "targetPlatform"),
    targetMarket: sanitizeOption(value.targetMarket, "targetMarket"),
    outputLanguage: sanitizeOption(value.outputLanguage, "outputLanguage"),
    outputRatio: sanitizeOption(value.outputRatio, "outputRatio"),
  };
}

export function getProductOutputSettingsFromSession(analysisHistoryId?: string) {
  const storageKey = getProductOutputSettingsSessionKey(analysisHistoryId);

  if (!storageKey || typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = sessionStorage.getItem(storageKey);

    return rawValue ? sanitizeProductOutputSettings(JSON.parse(rawValue)) : null;
  } catch {
    return null;
  }
}

export function getProductOutputSettingsLabel(settings: ProductOutputSettings, key: keyof ProductOutputSettings) {
  const options = {
    targetPlatform: PRODUCT_OUTPUT_PLATFORM_OPTIONS,
    targetMarket: PRODUCT_OUTPUT_MARKET_OPTIONS,
    outputLanguage: PRODUCT_OUTPUT_LANGUAGE_OPTIONS,
    outputRatio: PRODUCT_OUTPUT_RATIO_OPTIONS,
  }[key];

  return options.find((option) => option.value === settings[key])?.label || settings[key];
}

export function formatProductOutputSettingsSummary(settings: ProductOutputSettings) {
  return [
    summaryLabels.targetPlatform[settings.targetPlatform] || getProductOutputSettingsLabel(settings, "targetPlatform"),
    summaryLabels.targetMarket[settings.targetMarket] || getProductOutputSettingsLabel(settings, "targetMarket"),
    summaryLabels.outputLanguage[settings.outputLanguage] || getProductOutputSettingsLabel(settings, "outputLanguage"),
    summaryLabels.outputRatio[settings.outputRatio] || getProductOutputSettingsLabel(settings, "outputRatio"),
  ].join(" · ");
}
