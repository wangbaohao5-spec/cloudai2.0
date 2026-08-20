export type UsageType = "chat" | "copywriting" | "image" | "image-enhance" | "video" | "product-analysis";

export type UsageLimitRule = {
  windowSeconds: number;
  max: number;
};

export const USAGE_TYPES = ["chat", "copywriting", "image", "image-enhance", "video", "product-analysis"] as const;

export const USAGE_TYPE_LABELS = {
  chat: "创作助手",
  copywriting: "上架文案",
  image: "商品图",
  "image-enhance": "商品图精修",
  video: "视频工坊",
  "product-analysis": "商品分析",
} satisfies Record<UsageType, string>;

export const USAGE_LIMITS = {
  chat: [
    { windowSeconds: 10, max: 3 },
    { windowSeconds: 60, max: 12 },
    { windowSeconds: 24 * 60 * 60, max: 120 },
  ],
  copywriting: [
    { windowSeconds: 10, max: 2 },
    { windowSeconds: 60, max: 8 },
    { windowSeconds: 24 * 60 * 60, max: 100 },
  ],
  image: [
    { windowSeconds: 30, max: 2 },
    { windowSeconds: 60, max: 3 },
    { windowSeconds: 24 * 60 * 60, max: 30 },
  ],
  "image-enhance": [
    { windowSeconds: 60, max: 10 },
    { windowSeconds: 24 * 60 * 60, max: 100 },
  ],
  video: [
    { windowSeconds: 60, max: 1 },
    { windowSeconds: 24 * 60 * 60, max: 10 },
  ],
  "product-analysis": [
    { windowSeconds: 30, max: 2 },
    { windowSeconds: 60, max: 5 },
    { windowSeconds: 24 * 60 * 60, max: 50 },
  ],
} satisfies Record<UsageType, UsageLimitRule[]>;

export function getDailyUsageLimit(type: UsageType) {
  return USAGE_LIMITS[type].find((rule) => rule.windowSeconds >= 24 * 60 * 60)?.max || 0;
}
