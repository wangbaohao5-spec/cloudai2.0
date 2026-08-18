import type { ProductGenerationBrief } from "@/lib/product-types";

const ARRAY_ITEM_LIMIT = 8;
const SHORT_TEXT_LIMIT = 300;
const LONG_TEXT_LIMIT = 600;

export const DEFAULT_FORBIDDEN_PRODUCT_CLAIMS = "不要生成官方授权、正品保证、官方认证、国家认证、行业第一、100%、医疗功效等未经确认的内容。";

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
  const riskConfirmations = brief.riskConfirmations;

  return Boolean(
    brief.productName ||
      brief.targetAudience ||
      brief.styleRequirements ||
      brief.extraRequirements ||
      riskConfirmations?.confirmedBrandClaims ||
      riskConfirmations?.forbiddenClaims ||
      riskConfirmations?.complianceNotes ||
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

  const riskConfirmations = isRecord(value.riskConfirmations) ? value.riskConfirmations : {};
  const brief: ProductGenerationBrief = {
    productName: sanitizeString(value.productName, 160),
    coreSellingPoints: sanitizeStringArray(value.coreSellingPoints),
    targetAudience: sanitizeString(value.targetAudience),
    usageScenarios: sanitizeStringArray(value.usageScenarios),
    styleRequirements: sanitizeString(value.styleRequirements),
    mustKeepDetails: sanitizeStringArray(value.mustKeepDetails),
    avoidChanges: sanitizeStringArray(value.avoidChanges),
    extraRequirements: sanitizeString(value.extraRequirements, LONG_TEXT_LIMIT),
    riskConfirmations: {
      confirmedBrandClaims: sanitizeString(riskConfirmations.confirmedBrandClaims, LONG_TEXT_LIMIT),
      forbiddenClaims: sanitizeString(riskConfirmations.forbiddenClaims, LONG_TEXT_LIMIT) || DEFAULT_FORBIDDEN_PRODUCT_CLAIMS,
      complianceNotes: sanitizeString(riskConfirmations.complianceNotes, LONG_TEXT_LIMIT),
    },
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
