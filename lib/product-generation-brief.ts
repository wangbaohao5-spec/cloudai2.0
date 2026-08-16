import type { ProductGenerationBrief } from "@/lib/product-types";

const ARRAY_ITEM_LIMIT = 8;
const SHORT_TEXT_LIMIT = 300;
const LONG_TEXT_LIMIT = 600;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function truncateText(value: string, limit: number) {
  return value.trim().slice(0, limit);
}

function sanitizeString(value: unknown, limit = SHORT_TEXT_LIMIT) {
  return typeof value === "string" ? truncateText(value, limit) : "";
}

function sanitizeStringArray(value: unknown, limit = SHORT_TEXT_LIMIT) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === "string").map((item) => truncateText(item, limit)).filter(Boolean))).slice(
    0,
    ARRAY_ITEM_LIMIT,
  );
}

function hasBriefContent(brief: ProductGenerationBrief) {
  return Boolean(
    brief.productName ||
      brief.targetAudience ||
      brief.styleRequirements ||
      brief.extraRequirements ||
      brief.coreSellingPoints.length ||
      brief.usageScenarios.length ||
      brief.mustKeepDetails.length ||
      brief.avoidChanges.length,
  );
}

export function getProductGenerationBriefSessionKey(analysisHistoryId?: string) {
  return analysisHistoryId ? `cloudai:products:generation-brief:${analysisHistoryId}` : "";
}

export function sanitizeProductGenerationBrief(value: unknown): ProductGenerationBrief | null {
  if (!isRecord(value)) {
    return null;
  }

  const brief: ProductGenerationBrief = {
    productName: sanitizeString(value.productName, 160),
    coreSellingPoints: sanitizeStringArray(value.coreSellingPoints),
    targetAudience: sanitizeString(value.targetAudience),
    usageScenarios: sanitizeStringArray(value.usageScenarios),
    styleRequirements: sanitizeString(value.styleRequirements),
    mustKeepDetails: sanitizeStringArray(value.mustKeepDetails),
    avoidChanges: sanitizeStringArray(value.avoidChanges),
    extraRequirements: sanitizeString(value.extraRequirements, LONG_TEXT_LIMIT),
  };

  return hasBriefContent(brief) ? brief : null;
}

export function getProductGenerationBriefFromSession(analysisHistoryId?: string) {
  const storageKey = getProductGenerationBriefSessionKey(analysisHistoryId);

  if (!storageKey || typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);

    return rawValue ? sanitizeProductGenerationBrief(JSON.parse(rawValue)) : null;
  } catch {
    return null;
  }
}
