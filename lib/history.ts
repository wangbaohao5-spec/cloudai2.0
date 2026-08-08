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
