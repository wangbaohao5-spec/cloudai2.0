import { db } from "@/lib/db";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import { formatProductOutputSettingsSummary, sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import { getFileUrl, getImagePreviewUrlOrOriginal } from "@/lib/storage";
import type { ProductImageAnalysis, ProductOutputSettings } from "@/lib/product-types";
import type { Prisma } from "@prisma/client";

export type ProductProjectStatus = "planned" | "creating" | "has-assets" | "ready";

export type ProductProjectListItem = {
  analysisHistoryId: string;
  assetId?: string | null;
  category?: string | null;
  copywritingCount: number;
  createdAt: string;
  detailPageCount: number;
  imageEditCount: number;
  imageSetCount: number;
  imageUrl?: string | null;
  outputSettings?: ProductOutputSettings | null;
  outputSettingsSummary?: string | null;
  previewUrl?: string | null;
  sceneImageCount: number;
  status: ProductProjectStatus;
  statusLabel: string;
  title: string;
  totalAssetCount: number;
  updatedAt: string;
};

export type ProductProjectListResult = {
  limit: number;
  projects: ProductProjectListItem[];
  total: number;
};

type ProductAnalysisRecord = {
  assetId: string | null;
  createdAt: Date;
  id: string;
  output: Prisma.JsonValue;
  title: string;
};

type RelatedProjectRecord = {
  assetId: string | null;
  createdAt: Date;
  input: Prisma.JsonValue;
  output: Prisma.JsonValue;
  type: string;
};

type AssetRecord = {
  id: string;
  url: string;
};

type ProjectCounters = {
  copywritingCount: number;
  detailPageCount: number;
  imageEditCount: number;
  imageSetCount: number;
  sceneImageCount: number;
};

const PROJECT_LIST_DEFAULT_LIMIT = 30;
const PROJECT_LIST_MAX_LIMIT = 50;
const RELATED_RECORD_SCAN_FACTOR = 48;

function getObjectField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function getStringField(value: unknown, key: string) {
  const field = getObjectField(value, key);

  return typeof field === "string" ? field.trim() : "";
}

function getProductTitle(record: ProductAnalysisRecord, analysis: ProductImageAnalysis) {
  return analysis.productNameSuggestions?.[0]?.trim() || analysis.category?.trim() || record.title?.trim() || "未命名商品";
}

function getAnalysisHistoryId(record: Pick<RelatedProjectRecord, "input">) {
  return getStringField(record.input, "analysisHistoryId") || null;
}

function getRelatedRecordSource(record: Pick<RelatedProjectRecord, "input">) {
  return getStringField(record.input, "source");
}

function getRelatedRecordAnalysisId(record: RelatedProjectRecord, sourceAssetToAnalysisId: Map<string, string>) {
  const analysisHistoryId = getAnalysisHistoryId(record);

  if (analysisHistoryId) {
    return analysisHistoryId;
  }

  if (record.type !== "image-enhance") {
    return null;
  }

  const sourceAssetId = getStringField(record.input, "sourceAssetId");

  return sourceAssetId ? sourceAssetToAnalysisId.get(sourceAssetId) || null : null;
}

function getOutputSettings(records: RelatedProjectRecord[]) {
  return records
    .map((record) => sanitizeProductOutputSettings(getObjectField(record.input, "outputSettings")) || sanitizeProductOutputSettings(getObjectField(record.output, "outputSettings")))
    .find(Boolean);
}

function countProjectRecords(records: RelatedProjectRecord[]): ProjectCounters {
  return records.reduce<ProjectCounters>(
    (counters, record) => {
      const source = getRelatedRecordSource(record);

      if (record.type === "copywriting") {
        counters.copywritingCount += 1;
      } else if (record.type === "image-enhance") {
        counters.imageEditCount += 1;
      } else if (record.type === "image" && source === "product-image-set") {
        counters.imageSetCount += 1;
      } else if (record.type === "image" && source === "product-detail-page") {
        counters.detailPageCount += 1;
      } else if (record.type === "image" && source === "product-scene-image") {
        counters.sceneImageCount += 1;
      }

      return counters;
    },
    {
      copywritingCount: 0,
      detailPageCount: 0,
      imageEditCount: 0,
      imageSetCount: 0,
      sceneImageCount: 0,
    },
  );
}

function getProjectStatus(counters: ProjectCounters): Pick<ProductProjectListItem, "status" | "statusLabel"> {
  const totalAssetCount = counters.imageEditCount + counters.imageSetCount + counters.detailPageCount + counters.sceneImageCount;

  if (totalAssetCount > 0 && counters.copywritingCount > 0) {
    return {
      status: "ready",
      statusLabel: "可整理素材包",
    };
  }

  if (totalAssetCount > 0) {
    return {
      status: "has-assets",
      statusLabel: "已有素材",
    };
  }

  if (counters.copywritingCount > 0) {
    return {
      status: "creating",
      statusLabel: "创作中",
    };
  }

  return {
    status: "planned",
    statusLabel: "商品策划已完成",
  };
}

async function getSignedAssetUrl(assetId: string | null, assetMap: Map<string, AssetRecord>) {
  if (!assetId) {
    return null;
  }

  const asset = assetMap.get(assetId);

  if (!asset) {
    return null;
  }

  try {
    return await getFileUrl(asset.url);
  } catch {
    return null;
  }
}

async function getPreviewAssetUrl(assetId: string | null, assetMap: Map<string, AssetRecord>, originalUrl?: string | null) {
  if (!assetId) {
    return null;
  }

  const asset = assetMap.get(assetId);

  if (!asset) {
    return null;
  }

  return getImagePreviewUrlOrOriginal(asset.url, originalUrl);
}

async function toProductProjectListItem(
  record: ProductAnalysisRecord,
  assetMap: Map<string, AssetRecord>,
  records: RelatedProjectRecord[],
): Promise<ProductProjectListItem | null> {
  if (!isProductImageAnalysis(record.output)) {
    return null;
  }

  const counters = countProjectRecords(records);
  const totalAssetCount = counters.imageEditCount + counters.imageSetCount + counters.detailPageCount + counters.sceneImageCount;
  const status = getProjectStatus(counters);
  const updatedAt = records.reduce((latest, relatedRecord) => (relatedRecord.createdAt > latest ? relatedRecord.createdAt : latest), record.createdAt);
  const outputSettings = getOutputSettings(records) || null;
  const imageUrl = await getSignedAssetUrl(record.assetId, assetMap);

  return {
    analysisHistoryId: record.id,
    assetId: record.assetId,
    category: record.output.category || null,
    copywritingCount: counters.copywritingCount,
    createdAt: record.createdAt.toISOString(),
    detailPageCount: counters.detailPageCount,
    imageEditCount: counters.imageEditCount,
    imageSetCount: counters.imageSetCount,
    imageUrl,
    outputSettings,
    outputSettingsSummary: outputSettings ? formatProductOutputSettingsSummary(outputSettings) : null,
    previewUrl: await getPreviewAssetUrl(record.assetId, assetMap, imageUrl),
    sceneImageCount: counters.sceneImageCount,
    status: status.status,
    statusLabel: status.statusLabel,
    title: getProductTitle(record, record.output),
    totalAssetCount,
    updatedAt: updatedAt.toISOString(),
  };
}

export async function getProductProjectList(userId: string, options: { limit?: number } = {}): Promise<ProductProjectListResult> {
  const limit = Math.max(1, Math.min(options.limit || PROJECT_LIST_DEFAULT_LIMIT, PROJECT_LIST_MAX_LIMIT));
  const [productAnalysisRecords, total] = await Promise.all([
    db.historyRecord.findMany({
      where: {
        userId,
        type: "product-analysis",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        assetId: true,
        createdAt: true,
        id: true,
        output: true,
        title: true,
      },
    }),
    db.historyRecord.count({
      where: {
        userId,
        type: "product-analysis",
      },
    }),
  ]);

  const analysisIds = productAnalysisRecords.map((record) => record.id);
  const sourceAssetToAnalysisId = new Map(
    productAnalysisRecords
      .map((record) => (record.assetId ? ([record.assetId, record.id] as const) : null))
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  );
  const sourceAssetIds = Array.from(sourceAssetToAnalysisId.keys());
  const relatedRecords =
    analysisIds.length || sourceAssetIds.length
      ? await db.historyRecord.findMany({
          where: {
            userId,
            type: {
              in: ["copywriting", "image", "image-enhance"],
            },
            OR: [
              ...analysisIds.map((analysisHistoryId) => ({
                input: {
                  path: ["analysisHistoryId"],
                  equals: analysisHistoryId,
                },
              })),
              ...sourceAssetIds.map((sourceAssetId) => ({
                type: "image-enhance",
                input: {
                  path: ["sourceAssetId"],
                  equals: sourceAssetId,
                },
              })),
            ],
          },
          orderBy: {
            createdAt: "desc",
          },
          take: Math.max(limit * RELATED_RECORD_SCAN_FACTOR, 240),
          select: {
            assetId: true,
            createdAt: true,
            input: true,
            output: true,
            type: true,
          },
        })
      : [];
  const assetIds = Array.from(new Set(productAnalysisRecords.map((record) => record.assetId).filter((assetId): assetId is string => Boolean(assetId))));
  const assets = assetIds.length
    ? await db.asset.findMany({
        where: {
          userId,
          id: {
            in: assetIds,
          },
        },
        select: {
          id: true,
          url: true,
        },
      })
    : [];
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const recordsByAnalysisId = new Map<string, RelatedProjectRecord[]>();

  for (const record of relatedRecords) {
    const analysisHistoryId = getRelatedRecordAnalysisId(record, sourceAssetToAnalysisId);

    if (!analysisHistoryId) {
      continue;
    }

    const records = recordsByAnalysisId.get(analysisHistoryId) || [];

    records.push(record);
    recordsByAnalysisId.set(analysisHistoryId, records);
  }

  const projects = (await Promise.all(productAnalysisRecords.map((record) => toProductProjectListItem(record, assetMap, recordsByAnalysisId.get(record.id) || [])))).filter(
    (project): project is ProductProjectListItem => Boolean(project),
  );

  projects.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  return {
    limit,
    projects,
    total,
  };
}
