import { db } from "@/lib/db";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import { getFileUrl } from "@/lib/storage";
import type { ProductImageAnalysis } from "@/lib/product-types";

export type ProductHomeCard = {
  analysisHistoryId: string;
  title: string;
  category?: string | null;
  targetAudience?: string | null;
  imageUrl?: string | null;
  updatedAt: string;
};

export type DashboardHomeData = {
  continueProduct: ProductHomeCard | null;
  recentProducts: ProductHomeCard[];
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

async function toProductHomeCard(record: ProductAnalysisRecord, assetMap: Map<string, { url: string }>): Promise<ProductHomeCard | null> {
  if (!isProductImageAnalysis(record.output)) {
    return null;
  }

  return {
    analysisHistoryId: record.id,
    title: getProductTitle(record, record.output),
    category: record.output.category || null,
    targetAudience: record.output.targetAudience || null,
    imageUrl: await getSignedAssetUrl(record.assetId, assetMap),
    updatedAt: record.createdAt.toISOString(),
  };
}

export async function getDashboardHomeData(userId: string): Promise<DashboardHomeData> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [productAnalysisRecords, todayUsageRows, todaySceneImageCount] = await Promise.all([
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

  const assetIds = Array.from(
    new Set(productAnalysisRecords.map((record) => record.assetId).filter((assetId): assetId is string => Boolean(assetId))),
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

  const recentProductCards = (await Promise.all(dedupedRecords.map((record) => toProductHomeCard(record, assetMap)))).filter(
    (card): card is ProductHomeCard => Boolean(card),
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
