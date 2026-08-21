import { db } from "@/lib/db";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import { formatProductOutputSettingsSummary, sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import { getFileUrl, getImagePreviewUrlOrOriginal } from "@/lib/storage";
import type { ProductImageAnalysis } from "@/lib/product-types";

export type ProductHomeCard = {
  analysisHistoryId: string;
  assetCount: number;
  title: string;
  category?: string | null;
  targetAudience?: string | null;
  imageUrl?: string | null;
  previewUrl?: string | null;
  outputSettingsSummary?: string | null;
  statusSummary: string;
  suggestedAction: string;
  updatedAt: string;
};

export type DashboardRecentOutput = {
  analysisHistoryId?: string | null;
  imageUrl?: string | null;
  previewUrl?: string | null;
  label: string;
  title: string;
  createdAt: string;
};

export type DashboardHomeData = {
  continueProduct: ProductHomeCard | null;
  recentProducts: ProductHomeCard[];
  recentOutputs: DashboardRecentOutput[];
  todayGenerated: {
    productAnalysis: number;
    copywriting: number;
    image: number;
    imageEnhance: number;
    sceneImage: number;
    video: number;
    total: number;
  };
};

type ProductAnalysisRecord = {
  id: string;
  assetId: string | null;
  title: string;
  output: unknown;
  createdAt: Date;
};

type RelatedHistoryRecord = {
  assetId: string | null;
  createdAt: Date;
  input: unknown;
  output: unknown;
  title: string;
  type: string;
};

type ProductStatusSummary = {
  assetCount: number;
  outputSettingsSummary: string | null;
  statusSummary: string;
  suggestedAction: string;
};

function getProductTitle(record: ProductAnalysisRecord, analysis: ProductImageAnalysis) {
  return analysis.productNameSuggestions?.[0]?.trim() || analysis.category?.trim() || record.title || "未命名商品";
}

async function getSignedAssetUrl(assetId: string | null, assetMap: Map<string, { url: string }>) {
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

async function getPreviewAssetUrl(assetId: string | null, assetMap: Map<string, { url: string }>, originalUrl?: string | null) {
  if (!assetId) {
    return null;
  }

  const asset = assetMap.get(assetId);

  if (!asset) {
    return null;
  }

  return getImagePreviewUrlOrOriginal(asset.url, originalUrl);
}

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

function getAnalysisHistoryId(record: Pick<RelatedHistoryRecord, "input">) {
  return getStringField(record.input, "analysisHistoryId") || null;
}

function getRecentOutputLabel(record: Pick<RelatedHistoryRecord, "input" | "type">) {
  const source = getStringField(record.input, "source");

  if (record.type === "image-enhance") {
    return source === "product-image-edit" ? "原图优化" : "商品图精修";
  }

  if (source === "product-image-set") {
    return getNumberField(record.input, "imageIndex") === 1 ? "主图点击图" : "商品套图";
  }

  if (source === "product-detail-page") {
    return "详情页素材";
  }

  if (source === "product-scene-image") {
    return "历史场景图";
  }

  return record.type === "video" ? "视频素材" : "图片素材";
}

function isRecentOutputRecord(record: RelatedHistoryRecord) {
  return Boolean(record.assetId && (record.type === "image" || record.type === "image-enhance"));
}

function buildStatusSummary(records: RelatedHistoryRecord[]): ProductStatusSummary {
  const copywritingCount = records.filter((record) => record.type === "copywriting").length;
  const imageEditCount = records.filter((record) => record.type === "image-enhance").length;
  const imageSetCount = records.filter((record) => record.type === "image" && getStringField(record.input, "source") === "product-image-set").length;
  const detailPageCount = records.filter((record) => record.type === "image" && getStringField(record.input, "source") === "product-detail-page").length;
  const assetCount = imageEditCount + imageSetCount + detailPageCount + records.filter((record) => record.type === "image" && getStringField(record.input, "source") === "product-scene-image").length;
  const sortedRecords = [...records].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  const outputSettings = sortedRecords
    .map((record) => sanitizeProductOutputSettings(getObjectField(record.input, "outputSettings")) || sanitizeProductOutputSettings(getObjectField(record.output, "outputSettings")))
    .find(Boolean);

  if (assetCount > 0) {
    return {
      assetCount,
      outputSettingsSummary: outputSettings ? formatProductOutputSettingsSummary(outputSettings) : null,
      statusSummary: `已生成 ${assetCount} 项素材`,
      suggestedAction: "查看素材库",
    };
  }

  if (copywritingCount > 0) {
    return {
      assetCount,
      outputSettingsSummary: outputSettings ? formatProductOutputSettingsSummary(outputSettings) : null,
      statusSummary: "上架文案已生成",
      suggestedAction: "生成商品套图",
    };
  }

  return {
    assetCount,
    outputSettingsSummary: outputSettings ? formatProductOutputSettingsSummary(outputSettings) : null,
    statusSummary: "商品策划已完成",
    suggestedAction: "生成上架文案",
  };
}

async function toProductHomeCard(
  record: ProductAnalysisRecord,
  assetMap: Map<string, { url: string }>,
  statusSummary: ProductStatusSummary,
): Promise<ProductHomeCard | null> {
  if (!isProductImageAnalysis(record.output)) {
    return null;
  }

  const imageUrl = await getSignedAssetUrl(record.assetId, assetMap);

  return {
    analysisHistoryId: record.id,
    assetCount: statusSummary.assetCount,
    title: getProductTitle(record, record.output),
    category: record.output.category || null,
    targetAudience: record.output.targetAudience || null,
    imageUrl,
    outputSettingsSummary: statusSummary.outputSettingsSummary,
    previewUrl: await getPreviewAssetUrl(record.assetId, assetMap, imageUrl),
    statusSummary: statusSummary.statusSummary,
    suggestedAction: statusSummary.suggestedAction,
    updatedAt: record.createdAt.toISOString(),
  };
}

async function toRecentOutput(record: RelatedHistoryRecord, assetMap: Map<string, { url: string }>): Promise<DashboardRecentOutput | null> {
  if (!isRecentOutputRecord(record)) {
    return null;
  }

  const imageUrl = await getSignedAssetUrl(record.assetId, assetMap);
  const previewUrl = await getPreviewAssetUrl(record.assetId, assetMap, imageUrl);

  return {
    analysisHistoryId: getAnalysisHistoryId(record),
    createdAt: record.createdAt.toISOString(),
    imageUrl,
    label: getRecentOutputLabel(record),
    previewUrl,
    title: record.title || getRecentOutputLabel(record),
  };
}

export async function getDashboardHomeData(userId: string): Promise<DashboardHomeData> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [productAnalysisRecords, relatedHistoryRecords, todayUsageRows, todaySceneImageCount] = await Promise.all([
    db.historyRecord.findMany({
      where: {
        userId,
        type: "product-analysis",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
      select: {
        id: true,
        assetId: true,
        title: true,
        output: true,
        createdAt: true,
      },
    }),
    db.historyRecord.findMany({
      where: {
        userId,
        type: {
          in: ["copywriting", "image", "image-enhance"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 160,
      select: {
        assetId: true,
        title: true,
        type: true,
        input: true,
        output: true,
        createdAt: true,
      },
    }),
    db.usageRecord.groupBy({
      by: ["type"],
      where: {
        userId,
        createdAt: {
          gte: startOfToday,
        },
      },
      _count: {
        type: true,
      },
    }),
    db.historyRecord.count({
      where: {
        userId,
        type: "image",
        createdAt: {
          gte: startOfToday,
        },
        input: {
          path: ["source"],
          equals: "product-scene-image",
        },
      },
    }),
  ]);

  const recentOutputRecords = relatedHistoryRecords.filter(isRecentOutputRecord).slice(0, 8);
  const assetIds = Array.from(
    new Set(
      [
        ...productAnalysisRecords.map((record) => record.assetId),
        ...recentOutputRecords.map((record) => record.assetId),
      ].filter((assetId): assetId is string => Boolean(assetId)),
    ),
  );
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
  const dedupedRecords: ProductAnalysisRecord[] = [];
  const seenKeys = new Set<string>();

  for (const record of productAnalysisRecords) {
    const key = record.assetId || record.id;

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    dedupedRecords.push(record);

    if (dedupedRecords.length >= 4) {
      break;
    }
  }

  const relatedRecordsByAnalysisId = new Map<string, RelatedHistoryRecord[]>();

  for (const record of relatedHistoryRecords) {
    const analysisHistoryId = getAnalysisHistoryId(record);

    if (!analysisHistoryId) {
      continue;
    }

    const records = relatedRecordsByAnalysisId.get(analysisHistoryId) || [];

    records.push(record);
    relatedRecordsByAnalysisId.set(analysisHistoryId, records);
  }

  const recentProductCards = (await Promise.all(dedupedRecords.map((record) => toProductHomeCard(record, assetMap, buildStatusSummary(relatedRecordsByAnalysisId.get(record.id) || []))))).filter(
    (card): card is ProductHomeCard => Boolean(card),
  );
  const recentOutputs = (await Promise.all(recentOutputRecords.map((record) => toRecentOutput(record, assetMap)))).filter(
    (output): output is DashboardRecentOutput => Boolean(output),
  );
  const usageByType = Object.fromEntries(todayUsageRows.map((row) => [row.type, row._count.type]));
  const productAnalysis = usageByType["product-analysis"] || 0;
  const copywriting = usageByType.copywriting || 0;
  const image = usageByType.image || 0;
  const imageEnhance = usageByType["image-enhance"] || 0;
  const video = usageByType.video || 0;

  return {
    continueProduct: recentProductCards[0] || null,
    recentProducts: recentProductCards,
    recentOutputs,
    todayGenerated: {
      productAnalysis,
      copywriting,
      image,
      imageEnhance,
      sceneImage: todaySceneImageCount,
      video,
      total: productAnalysis + copywriting + image + imageEnhance + video,
    },
  };
}
