import { ApiError } from "@/lib/api-errors";
import { getAssetForUser } from "@/lib/assets";
import { getHistoryRecordForUser, getProductRelatedHistory } from "@/lib/history";
import { hydrateHistoryAssetUrls } from "@/lib/history-assets";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import type { ProductImageAnalysis } from "@/lib/product-types";
import { getFileUrl, getImagePreviewUrlOrOriginal } from "@/lib/storage";
import type { HistoryRecord } from "@/lib/types";

export type ProductCreationCenterAsset = {
  id: string;
  type: string;
  name: string;
  previewUrl?: string | null;
  url: string;
};

export type ProductCreationCenterImageEdit = HistoryRecord & {
  imageUrl: string | null;
};

export type ProductCreationCenterData = {
  product: {
    analysisHistoryId: string;
    assetId: string | null;
    title: string;
    createdAt: string;
  };
  analysis: ProductImageAnalysis;
  originalAsset: ProductCreationCenterAsset | null;
  copywriting: HistoryRecord[];
  detailPages: HistoryRecord[];
  imageEdits: ProductCreationCenterImageEdit[];
  imageSetImages: HistoryRecord[];
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

function getNumberField(value: unknown, key: string) {
  const field = getObjectField(value, key);

  return typeof field === "number" && Number.isFinite(field) ? field : null;
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

function isDetailPageForAnalysis(record: HistoryRecord, analysisHistoryId: string) {
  return (
    record.type === "image" &&
    getStringField(record.input, "source") === "product-detail-page" &&
    getStringField(record.input, "analysisHistoryId") === analysisHistoryId
  );
}

function isImageSetImageForAnalysis(record: HistoryRecord, analysisHistoryId: string) {
  return (
    record.type === "image" &&
    getStringField(record.input, "source") === "product-image-set" &&
    getStringField(record.input, "analysisHistoryId") === analysisHistoryId
  );
}

function sortDetailPages(left: HistoryRecord, right: HistoryRecord) {
  const leftPageIndex = getNumberField(left.input, "pageIndex");
  const rightPageIndex = getNumberField(right.input, "pageIndex");

  if (leftPageIndex !== null && rightPageIndex !== null && leftPageIndex !== rightPageIndex) {
    return leftPageIndex - rightPageIndex;
  }

  if (leftPageIndex !== null && rightPageIndex === null) {
    return -1;
  }

  if (leftPageIndex === null && rightPageIndex !== null) {
    return 1;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function sortImageSetImages(left: HistoryRecord, right: HistoryRecord) {
  const leftImageIndex = getNumberField(left.input, "imageIndex");
  const rightImageIndex = getNumberField(right.input, "imageIndex");

  if (leftImageIndex !== null && rightImageIndex !== null && leftImageIndex !== rightImageIndex) {
    return leftImageIndex - rightImageIndex;
  }

  if (leftImageIndex !== null && rightImageIndex === null) {
    return -1;
  }

  if (leftImageIndex === null && rightImageIndex !== null) {
    return 1;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function toProductCreationCenterImageEdit(record: HistoryRecord): ProductCreationCenterImageEdit {
  return {
    ...record,
    imageUrl: record.originalUrl || null,
  };
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

  const [relatedHistoryRecords, originalAssetRecord] = await Promise.all([
    getProductRelatedHistory({
      userId,
      analysisHistoryId: analysisRecord.id,
      sourceAssetId: analysisRecord.assetId,
    }),
    analysisRecord.assetId ? getAssetForUser(userId, analysisRecord.assetId) : Promise.resolve(null),
  ]);
  const historyRecords = await hydrateHistoryAssetUrls(userId, relatedHistoryRecords);
  const originalAsset = originalAssetRecord
    ? await (async () => {
        const originalUrl = await getFileUrl(originalAssetRecord.url);

        return {
          id: originalAssetRecord.id,
          type: originalAssetRecord.type,
          name: originalAssetRecord.name,
          previewUrl: await getImagePreviewUrlOrOriginal(originalAssetRecord.url, originalUrl),
          url: originalUrl,
        };
      })()
    : null;

  return {
    product: {
      analysisHistoryId: analysisRecord.id,
      assetId: analysisRecord.assetId ?? null,
      title: analysisRecord.title,
      createdAt: analysisRecord.createdAt,
    },
    analysis: analysisRecord.output,
    originalAsset,
    copywriting: historyRecords.filter((record) => isCopywritingForAnalysis(record, analysisRecord.id)),
    detailPages: historyRecords.filter((record) => isDetailPageForAnalysis(record, analysisRecord.id)).sort(sortDetailPages),
    imageEdits: historyRecords
      .filter((record) => isImageEditForAnalysis(record, analysisRecord.id, analysisRecord.assetId))
      .map(toProductCreationCenterImageEdit),
    imageSetImages: historyRecords.filter((record) => isImageSetImageForAnalysis(record, analysisRecord.id)).sort(sortImageSetImages),
    sceneImages: historyRecords.filter((record) => isSceneImageForAnalysis(record, analysisRecord.id)),
  };
}
