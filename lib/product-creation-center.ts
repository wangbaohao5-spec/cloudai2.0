import { ApiError } from "@/lib/api-errors";
import { getAssetForUser } from "@/lib/assets";
import { getHistory, getHistoryRecordForUser } from "@/lib/history";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import type { ProductImageAnalysis } from "@/lib/product-types";
import { getFileUrl } from "@/lib/storage";
import type { HistoryRecord } from "@/lib/types";

export type ProductCreationCenterAsset = {
  id: string;
  type: string;
  name: string;
  url: string;
};

export type ProductCreationCenterData = {
  product: {
    analysisHistoryId: string;
    title: string;
    createdAt: string;
  };
  analysis: ProductImageAnalysis;
  originalAsset: ProductCreationCenterAsset | null;
  copywriting: HistoryRecord[];
  imageEdits: HistoryRecord[];
  sceneImages: HistoryRecord[];
};

function getObjectField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function getStringField(value: unknown, key: string) {
  const field = getObjectField(value, key);

  return typeof field === "string" ? field : "";
}

function isCopywritingForAnalysis(record: HistoryRecord, analysisHistoryId: string) {
  return record.type === "copywriting" && getStringField(record.input, "analysisHistoryId") === analysisHistoryId;
}

function isImageEditForAnalysis(record: HistoryRecord, analysisHistoryId: string, sourceAssetId?: string | null) {
  if (record.type !== "image-enhance") {
    return false;
  }

  const linkedAnalysisHistoryId = getStringField(record.input, "analysisHistoryId");

  if (linkedAnalysisHistoryId) {
    return linkedAnalysisHistoryId === analysisHistoryId;
  }

  return Boolean(sourceAssetId && getStringField(record.input, "sourceAssetId") === sourceAssetId);
}

function isSceneImageForAnalysis(record: HistoryRecord, analysisHistoryId: string) {
  return (
    record.type === "image" &&
    getStringField(record.input, "source") === "product-scene-image" &&
    getStringField(record.input, "analysisHistoryId") === analysisHistoryId
  );
}

export async function getProductCreationCenterData(userId: string, analysisHistoryId: string): Promise<ProductCreationCenterData> {
  const analysisRecord = await getHistoryRecordForUser(userId, analysisHistoryId);

  if (!analysisRecord) {
    throw new ApiError("Product analysis history not found.", 404);
  }

  if (analysisRecord.type !== "product-analysis") {
    throw new ApiError("History record is not a product analysis.", 400);
  }

  if (!isProductImageAnalysis(analysisRecord.output)) {
    throw new ApiError("Product analysis result is invalid.", 400);
  }

  const [historyRecords, originalAssetRecord] = await Promise.all([
    getHistory(userId),
    analysisRecord.assetId ? getAssetForUser(userId, analysisRecord.assetId) : Promise.resolve(null),
  ]);
  const originalAsset = originalAssetRecord
    ? {
        id: originalAssetRecord.id,
        type: originalAssetRecord.type,
        name: originalAssetRecord.name,
        url: await getFileUrl(originalAssetRecord.url),
      }
    : null;

  return {
    product: {
      analysisHistoryId: analysisRecord.id,
      title: analysisRecord.title,
      createdAt: analysisRecord.createdAt,
    },
    analysis: analysisRecord.output,
    originalAsset,
    copywriting: historyRecords.filter((record) => isCopywritingForAnalysis(record, analysisRecord.id)),
    imageEdits: historyRecords.filter((record) => isImageEditForAnalysis(record, analysisRecord.id, analysisRecord.assetId)),
    sceneImages: historyRecords.filter((record) => isSceneImageForAnalysis(record, analysisRecord.id)),
  };
}
