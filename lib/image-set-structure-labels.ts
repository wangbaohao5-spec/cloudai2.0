import type { ProductImageSetCustomStructure, ProductImageSetPurpose, ProductImageSetStructureMode } from "@/lib/ai/product-image-set-plan-prompt-builder";

const PURPOSE_LABELS: Record<ProductImageSetPurpose, string> = {
  "detail-page": "详情页套图",
  "platform-listing": "平台 Listing",
  "quick-listing": "快速上架",
  "social-seeding": "社媒种草",
};

const STRUCTURE_MODE_LABELS: Record<ProductImageSetStructureMode, string> = {
  custom: "自定义配置",
  smart: "智能匹配",
};

const CUSTOM_STRUCTURE_LABELS: Array<{ key: keyof ProductImageSetCustomStructure; label: string }> = [
  { key: "whiteBackground", label: "白底图" },
  { key: "usageScene", label: "场景图" },
  { key: "sellingPoint", label: "卖点图" },
  { key: "detailCloseup", label: "细节图" },
  { key: "sizeSpec", label: "尺寸/参数图" },
  { key: "comparison", label: "对比图" },
  { key: "other", label: "其他" },
];

function getPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

export function getImageSetPurposeLabel(purpose?: string | null) {
  return purpose && purpose in PURPOSE_LABELS ? PURPOSE_LABELS[purpose as ProductImageSetPurpose] : "未记录";
}

export function getImageSetStructureModeLabel(mode?: string | null) {
  return mode && mode in STRUCTURE_MODE_LABELS ? STRUCTURE_MODE_LABELS[mode as ProductImageSetStructureMode] : "未记录";
}

export function formatCustomStructure(customStructure?: Partial<ProductImageSetCustomStructure> | null) {
  if (!customStructure || typeof customStructure !== "object") {
    return "";
  }

  return CUSTOM_STRUCTURE_LABELS.map((item) => {
    const value = getPositiveNumber(customStructure[item.key]);

    return value ? `${item.label} ${value}` : "";
  })
    .filter(Boolean)
    .join(" / ");
}
