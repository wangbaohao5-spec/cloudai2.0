import { ApiError } from "@/lib/api-errors";
import { db } from "@/lib/db";
import {
  type DetailPageAssetCandidate,
  type DetailPageAssetRelationEvidence,
  type DetailPageAssetSourceType,
  type DetailPageModuleType,
} from "@/lib/detail-page-project";
import { getHistoryRecordForUser, getProductRelatedHistory } from "@/lib/history";
import { DETAIL_PAGE_CANVAS_PREVIEW_TRANSFORM, getImagePreviewUrl } from "@/lib/storage";
import type { HistoryRecord } from "@/lib/types";

const DETAIL_PAGE_ASSET_CANDIDATE_LIMIT = 48;

type CandidateReference = {
  assetId: string;
  historyId: string | null;
  imageType: string | null;
  productRelationEvidence: DetailPageAssetRelationEvidence;
  sourceType: DetailPageAssetSourceType;
  suggestedModuleTypes: DetailPageModuleType[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getStringField(value: unknown, key: string) {
  if (!isRecord(value)) return "";
  return typeof value[key] === "string" ? value[key].trim() : "";
}

function getNestedStringField(value: unknown, parent: string, key: string) {
  if (!isRecord(value)) return "";
  return getStringField(value[parent], key);
}

function uniqueModuleTypes(moduleTypes: DetailPageModuleType[]) {
  return Array.from(new Set(moduleTypes));
}

export function getSuggestedDetailPageModuleTypes(sourceType: DetailPageAssetSourceType, imageType: string | null) {
  if (sourceType === "original") {
    return ["HERO"] satisfies DetailPageModuleType[];
  }

  const normalized = imageType?.trim().toLowerCase().replaceAll("_", "-") || "";
  const suggestions: DetailPageModuleType[] = [];

  if (/^(hero|main|main-image|commerce-hero|product-hero)$/.test(normalized)) suggestions.push("HERO");
  if (/^(scene|usage-scene|lifestyle|environment)$/.test(normalized)) suggestions.push("USAGE_SCENE");
  if (/^(detail|product-detail|detail-closeup|close-up|closeup|material-detail|four-grid-detail)$/.test(normalized)) suggestions.push("PRODUCT_DETAIL");
  if (/^(brand|brand-content|editorial|trust|cta)$/.test(normalized)) suggestions.push("BRAND_CONTENT");
  if (/^(benefits|selling-point|feature)$/.test(normalized)) suggestions.push("BENEFITS");

  return uniqueModuleTypes(suggestions);
}

function getSourceType(record: HistoryRecord): DetailPageAssetSourceType {
  const source = getStringField(record.input, "source");

  if (source === "product-image-set") return "image-set";
  if (source === "product-detail-page" || source === "detail-page-v2") return "detail-page";
  if (source === "product-scene-image") return "scene-image";
  if (source === "product-image-edit" || record.type === "image-enhance") return "image-edit";
  return "product-image";
}

function getImageType(record: HistoryRecord) {
  return (
    getStringField(record.input, "imageType") ||
    getStringField(record.input, "sectionType") ||
    getStringField(record.input, "moduleType") ||
    getNestedStringField(record.input, "image", "imageType") ||
    getNestedStringField(record.input, "page", "sectionType") ||
    null
  );
}

function getRelationEvidence(record: HistoryRecord, analysisHistoryId: string, sourceAssetId: string | null) {
  if (getStringField(record.input, "analysisHistoryId") === analysisHistoryId) {
    return "history-analysis-id" satisfies DetailPageAssetRelationEvidence;
  }

  if (sourceAssetId && getStringField(record.input, "sourceAssetId") === sourceAssetId) {
    return "history-source-asset" satisfies DetailPageAssetRelationEvidence;
  }

  return null;
}

async function discoverDetailPageAssetCandidates({
  analysisHistoryId,
  assetId,
  includePreview,
  userId,
}: {
  analysisHistoryId: string;
  assetId?: string;
  includePreview: boolean;
  userId: string;
}) {
  const analysisRecord = await getHistoryRecordForUser(userId, analysisHistoryId);

  if (!analysisRecord) throw new ApiError("Product analysis history not found.", 404);
  if (analysisRecord.type !== "product-analysis") throw new ApiError("History record is not a product analysis.", 400);

  const sourceAssetId = analysisRecord.assetId || null;
  const relatedHistory = await getProductRelatedHistory({ userId, analysisHistoryId, sourceAssetId });
  const references = new Map<string, CandidateReference>();

  if (sourceAssetId) {
    references.set(sourceAssetId, {
      assetId: sourceAssetId,
      historyId: analysisRecord.id,
      imageType: null,
      productRelationEvidence: "analysis-source-asset",
      sourceType: "original",
      suggestedModuleTypes: getSuggestedDetailPageModuleTypes("original", "original"),
    });
  }

  for (const record of relatedHistory) {
    if (!record.assetId || references.has(record.assetId)) continue;
    const productRelationEvidence = getRelationEvidence(record, analysisHistoryId, sourceAssetId);
    if (!productRelationEvidence) continue;
    const sourceType = getSourceType(record);
    const imageType = getImageType(record);

    references.set(record.assetId, {
      assetId: record.assetId,
      historyId: record.id,
      imageType,
      productRelationEvidence,
      sourceType,
      suggestedModuleTypes: getSuggestedDetailPageModuleTypes(sourceType, imageType),
    });
  }

  const scopedReferences = Array.from(references.values())
    .filter((reference) => !assetId || reference.assetId === assetId)
    .slice(0, DETAIL_PAGE_ASSET_CANDIDATE_LIMIT);

  if (!scopedReferences.length) return [];

  const assets = await db.asset.findMany({
    where: {
      id: { in: scopedReferences.map((reference) => reference.assetId) },
      userId,
      type: { in: ["image", "upload"] },
    },
    select: {
      createdAt: true,
      id: true,
      name: true,
      type: true,
      url: true,
    },
  });
  const referenceMap = new Map(scopedReferences.map((reference) => [reference.assetId, reference]));

  const candidates = await Promise.all(
    assets.map(async (asset): Promise<DetailPageAssetCandidate> => {
      const reference = referenceMap.get(asset.id)!;
      let displayUrl: string | null = null;
      let previewUrl: string | null = null;

      if (includePreview) {
        const [thumbnailResult, displayResult] = await Promise.allSettled([
          getImagePreviewUrl(asset.url),
          getImagePreviewUrl(asset.url, undefined, DETAIL_PAGE_CANVAS_PREVIEW_TRANSFORM),
        ]);

        if (thumbnailResult.status === "fulfilled") previewUrl = thumbnailResult.value;
        if (displayResult.status === "fulfilled") displayUrl = displayResult.value;

        if (thumbnailResult.status === "rejected" || displayResult.status === "rejected") {
          console.warn("[detail-page-assets] preview signing failed", {
            assetId: asset.id,
            displayPreviewFailed: displayResult.status === "rejected",
            thumbnailFailed: thumbnailResult.status === "rejected",
          });
        }
      }

      return {
        assetId: asset.id,
        assetType: asset.type,
        createdAt: asset.createdAt.toISOString(),
        displayUrl,
        historyId: reference.historyId,
        imageType: reference.imageType,
        name: asset.name,
        previewUrl,
        productRelationEvidence: reference.productRelationEvidence,
        sourceType: reference.sourceType,
        suggestedModuleTypes: reference.suggestedModuleTypes,
      };
    }),
  );

  return candidates.sort((left, right) => {
    if (left.sourceType === "original" && right.sourceType !== "original") return -1;
    if (right.sourceType === "original" && left.sourceType !== "original") return 1;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function getDetailPageAssetCandidates(userId: string, analysisHistoryId: string) {
  return discoverDetailPageAssetCandidates({ userId, analysisHistoryId, includePreview: true });
}

export async function getDetailPageAssetCandidateForBinding(userId: string, analysisHistoryId: string, assetId: string) {
  const candidates = await discoverDetailPageAssetCandidates({ userId, analysisHistoryId, assetId, includePreview: false });
  return candidates[0] || null;
}
