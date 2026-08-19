import type {
  ProductImageSetCustomStructure,
  ProductImageSetPlanImage,
  ProductImageSetStructureMode,
} from "@/lib/ai/product-image-set-plan-prompt-builder";

export type ImageSetStructureValidationStatus = "not-needed" | "matched" | "partial" | "mismatched";

export type ImageSetStructureValidationItem = {
  key: string;
  label: string;
  expected: number;
  actual: number;
};

export type ImageSetStructureValidationResult = {
  status: ImageSetStructureValidationStatus;
  totalExpected: number;
  totalActual: number;
  items: ImageSetStructureValidationItem[];
  summary: string;
};

type ImageSetStructureKey = keyof ProductImageSetCustomStructure;

type ImageSetStructureValidationInput = {
  customStructure?: ProductImageSetCustomStructure | null;
  images?: Array<Pick<ProductImageSetPlanImage, "imageType"> | { imageType?: string }>;
  structureMode?: ProductImageSetStructureMode;
};

const STRUCTURE_LABELS: Record<ImageSetStructureKey, string> = {
  comparison: "对比图",
  detailCloseup: "细节图",
  other: "其他",
  sellingPoint: "卖点图",
  sizeSpec: "尺寸/参数图",
  usageScene: "场景图",
  whiteBackground: "白底图",
};

const PRIMARY_STRUCTURE_KEYS: ImageSetStructureKey[] = ["whiteBackground", "usageScene", "sellingPoint", "detailCloseup", "other"];
const EXTENDED_STRUCTURE_KEYS: ImageSetStructureKey[] = ["sizeSpec", "comparison"];

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(Math.trunc(value), 0) : 0;
}

function getExpectedStructureKeys(customStructure: ProductImageSetCustomStructure) {
  const extendedKeys = EXTENDED_STRUCTURE_KEYS.filter((key) => getNumber(customStructure[key]) > 0);

  return [...PRIMARY_STRUCTURE_KEYS, ...extendedKeys];
}

function mapImageTypeToStructureKey(imageType: string, customStructure: ProductImageSetCustomStructure): ImageSetStructureKey {
  switch (imageType.trim().toLowerCase()) {
    case "hero":
    case "main-image":
    case "product-main":
    case "white-background":
      return "whiteBackground";
    case "benefit":
    case "core-selling-point":
    case "feature":
    case "selling-point":
      return "sellingPoint";
    case "lifestyle":
    case "model-wearing":
    case "scene":
    case "usage-scene":
      return "usageScene";
    case "closeup":
    case "detail-closeup":
    case "four-grid-detail":
    case "material-detail":
      return "detailCloseup";
    case "size-spec":
    case "specification":
      return getNumber(customStructure.sizeSpec) > 0 ? "sizeSpec" : "other";
    case "comparison":
      return getNumber(customStructure.comparison) > 0 ? "comparison" : "other";
    default:
      return "other";
  }
}

function getValidationStatus(items: ImageSetStructureValidationItem[], totalExpected: number, totalActual: number): ImageSetStructureValidationStatus {
  if (totalExpected === totalActual && items.every((item) => item.expected === item.actual)) {
    return "matched";
  }

  const totalDifference = Math.abs(totalExpected - totalActual);
  const categoryDifference = items.reduce((total, item) => total + Math.abs(item.expected - item.actual), 0);

  return totalDifference <= 1 && categoryDifference <= 2 ? "partial" : "mismatched";
}

function getSummary(status: ImageSetStructureValidationStatus) {
  if (status === "matched") {
    return "结构匹配：AI 规划已符合你的自定义配置。";
  }

  if (status === "partial") {
    return "结构基本匹配：部分图片类型与自定义配置略有偏差，可继续生成或重新规划。";
  }

  if (status === "mismatched") {
    return "结构未完全匹配：AI 规划结果与自定义配置差异较大，建议重新生成规划。";
  }

  return "";
}

export function validateImageSetStructure({
  customStructure,
  images,
  structureMode,
}: ImageSetStructureValidationInput): ImageSetStructureValidationResult {
  if (structureMode !== "custom" || !customStructure || !images?.length) {
    return {
      status: "not-needed",
      totalExpected: 0,
      totalActual: images?.length || 0,
      items: [],
      summary: "",
    };
  }

  const structureKeys = getExpectedStructureKeys(customStructure);
  const counts = structureKeys.reduce(
    (record, key) => ({
      ...record,
      [key]: 0,
    }),
    {} as Record<ImageSetStructureKey, number>,
  );

  for (const image of images) {
    const key = mapImageTypeToStructureKey(image.imageType || "", customStructure);
    counts[key] = (counts[key] || 0) + 1;
  }

  const items = structureKeys
    .map((key) => ({
      key,
      label: STRUCTURE_LABELS[key],
      expected: getNumber(customStructure[key]),
      actual: counts[key] || 0,
    }))
    .filter((item) => item.expected > 0 || item.actual > 0);
  const totalExpected = structureKeys.reduce((total, key) => total + getNumber(customStructure[key]), 0);
  const totalActual = images.length;
  const status = getValidationStatus(items, totalExpected, totalActual);

  return {
    status,
    totalExpected,
    totalActual,
    items,
    summary: getSummary(status),
  };
}
