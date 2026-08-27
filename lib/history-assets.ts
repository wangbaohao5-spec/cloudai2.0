import { db } from "@/lib/db";
import { getFileUrl } from "@/lib/storage";
import type { HistoryRecord } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getMediaUrl(output: unknown) {
  if (!isRecord(output)) {
    return "";
  }

  const value = output.imageUrl || output.videoUrl || output.url;

  return typeof value === "string" ? value : "";
}

function isSupabaseSignedUrl(value: string) {
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return false;
  }

  try {
    return new URL(value).pathname.includes("/storage/v1/object/sign/");
  } catch {
    return false;
  }
}

function shouldHydrateMedia(record: HistoryRecord) {
  return record.type === "image" || record.type === "image-enhance" || record.type === "product-analysis" || record.type === "video";
}

function withoutMediaUrl(record: HistoryRecord): HistoryRecord {
  if (!isRecord(record.output)) {
    return {
      ...record,
      originalUrl: null,
      previewUrl: null,
    };
  }

  const output = { ...record.output };

  delete output.imageUrl;
  delete output.videoUrl;
  delete output.url;

  return {
    ...record,
    output,
    originalUrl: null,
    previewUrl: null,
  };
}

function withFreshMediaUrl(record: HistoryRecord, url: string): HistoryRecord {
  const output = isRecord(record.output) ? { ...record.output } : {};

  if (record.type === "video") {
    output.videoUrl = url;
  } else {
    output.imageUrl = url;
  }

  return {
    ...record,
    output,
    originalUrl: url,
  };
}

function sanitizeUnlinkedLegacyUrl(record: HistoryRecord) {
  const mediaUrl = getMediaUrl(record.output);

  if (!mediaUrl || mediaUrl.startsWith("data:") || !isSupabaseSignedUrl(mediaUrl)) {
    return record;
  }

  return withoutMediaUrl(record);
}

export async function hydrateHistoryAssetUrls(userId: string, records: HistoryRecord[]): Promise<HistoryRecord[]> {
  const assetIds = Array.from(
    new Set(
      records
        .filter(shouldHydrateMedia)
        .map((record) => record.assetId)
        .filter((assetId): assetId is string => Boolean(assetId)),
    ),
  );

  if (!assetIds.length) {
    return records.map(sanitizeUnlinkedLegacyUrl);
  }

  const assets = await db.asset.findMany({
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
  });
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  return Promise.all(
    records.map(async (record) => {
      if (!shouldHydrateMedia(record)) {
        return record;
      }

      if (!record.assetId) {
        return sanitizeUnlinkedLegacyUrl(record);
      }

      const asset = assetMap.get(record.assetId);

      if (!asset) {
        return withoutMediaUrl(record);
      }

      try {
        return withFreshMediaUrl(record, await getFileUrl(asset.url));
      } catch (error) {
        console.warn("[asset-hydration] signed URL generation failed", {
          assetId: record.assetId,
          errorName: error instanceof Error ? error.name : "UnknownError",
          historyId: record.id,
        });

        return withoutMediaUrl(record);
      }
    }),
  );
}
