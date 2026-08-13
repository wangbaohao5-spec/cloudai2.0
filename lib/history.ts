import { db } from "@/lib/db";
import type { HistoryRecord } from "@/lib/types";
import type { Prisma } from "@prisma/client";

export type HistoryRecordInput = {
  userId: string;
  assetId?: string | null;
  type: HistoryRecord["type"];
  title: string;
  input: unknown;
  output: unknown;
};

export type HistoryPageResult = {
  records: HistoryRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

type RelatedProductHistoryInput = {
  userId: string;
  analysisHistoryId: string;
  sourceAssetId?: string | null;
};

function toHistoryRecord(record: {
  id: string;
  assetId: string | null;
  type: string;
  title: string;
  input: Prisma.JsonValue;
  output: Prisma.JsonValue;
  createdAt: Date;
}): HistoryRecord {
  return {
    id: record.id,
    assetId: record.assetId,
    type: record.type as HistoryRecord["type"],
    title: record.title,
    input: record.input,
    output: record.output,
    createdAt: record.createdAt.toISOString(),
  };
}

const historyRecordSelect = {
  id: true,
  assetId: true,
  type: true,
  title: true,
  input: true,
  output: true,
  createdAt: true,
} satisfies Prisma.HistoryRecordSelect;

export async function saveHistory(record: HistoryRecordInput) {
  return db.historyRecord.create({
    data: {
      userId: record.userId,
      assetId: record.assetId || null,
      type: record.type,
      title: record.title,
      input: record.input as Prisma.InputJsonValue,
      output: record.output as Prisma.InputJsonValue,
    },
  });
}

export async function getHistory(userId: string): Promise<HistoryRecord[]> {
  const records = await db.historyRecord.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return records.map(toHistoryRecord);
}

export async function getHistoryPage(userId: string, take = 20, cursor?: string | null): Promise<HistoryPageResult> {
  const pageSize = Math.max(1, Math.min(take, 50));
  const records = await db.historyRecord.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: pageSize + 1,
    ...(cursor
      ? {
          cursor: {
            id: cursor,
          },
          skip: 1,
        }
      : {}),
    select: historyRecordSelect,
  });
  const visibleRecords = records.slice(0, pageSize);

  return {
    records: visibleRecords.map(toHistoryRecord),
    nextCursor: records.length > pageSize ? visibleRecords.at(-1)?.id || null : null,
    hasMore: records.length > pageSize,
  };
}

export async function getRecentHistory(userId: string, take = 8): Promise<HistoryRecord[]> {
  const records = await db.historyRecord.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take,
  });

  return records.map(toHistoryRecord);
}

export async function getProductRelatedHistory({ userId, analysisHistoryId, sourceAssetId }: RelatedProductHistoryInput): Promise<HistoryRecord[]> {
  const records = await db.historyRecord.findMany({
    where: {
      userId,
      OR: [
        {
          type: "copywriting",
          input: {
            path: ["analysisHistoryId"],
            equals: analysisHistoryId,
          },
        },
        {
          type: "image",
          input: {
            path: ["analysisHistoryId"],
            equals: analysisHistoryId,
          },
        },
        {
          type: "image-enhance",
          input: {
            path: ["analysisHistoryId"],
            equals: analysisHistoryId,
          },
        },
        ...(sourceAssetId
          ? [
              {
                type: "image-enhance",
                input: {
                  path: ["sourceAssetId"],
                  equals: sourceAssetId,
                },
              },
            ]
          : []),
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    select: historyRecordSelect,
  });

  return records.map(toHistoryRecord);
}

export async function getHistoryRecordForUser(userId: string, id: string): Promise<HistoryRecord | null> {
  const record = await db.historyRecord.findFirst({
    where: {
      id,
      userId,
    },
  });

  return record ? toHistoryRecord(record) : null;
}

export async function deleteHistory(userId: string, id: string) {
  await db.historyRecord.deleteMany({
    where: {
      id,
      userId,
    },
  });
}

export async function clearHistory(userId: string) {
  await db.historyRecord.deleteMany({
    where: {
      userId,
    },
  });
}
