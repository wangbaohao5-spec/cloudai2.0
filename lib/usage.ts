import { db } from "@/lib/db";

export type UsageRecord = {
  id: string;
  type: "chat" | "copywriting" | "image" | "image-enhance" | "video";
  model: string;
  createdAt: string;
};

export type UsageStats = {
  today: number;
  month: number;
  total: number;
  byType: Record<UsageRecord["type"], number>;
};

export type UsageRecordInput = {
  userId: string;
  type: UsageRecord["type"];
  model: string;
};

export async function recordUsage(record: UsageRecordInput) {
  return db.usageRecord.create({
    data: {
      userId: record.userId,
      type: record.type,
      model: record.model,
    },
  });
}

export async function getUsageStats(userId: string): Promise<UsageStats> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [today, month, total, byTypeRows] = await Promise.all([
    db.usageRecord.count({
      where: {
        userId,
        createdAt: {
          gte: startOfToday,
        },
      },
    }),
    db.usageRecord.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    }),
    db.usageRecord.count({
      where: {
        userId,
      },
    }),
    db.usageRecord.groupBy({
      by: ["type"],
      where: {
        userId,
      },
      _count: {
        type: true,
      },
    }),
  ]);

  return {
    today,
    month,
    total,
    byType: {
      chat: byTypeRows.find((row) => row.type === "chat")?._count.type || 0,
      copywriting: byTypeRows.find((row) => row.type === "copywriting")?._count.type || 0,
      image: byTypeRows.find((row) => row.type === "image")?._count.type || 0,
      "image-enhance": byTypeRows.find((row) => row.type === "image-enhance")?._count.type || 0,
      video: byTypeRows.find((row) => row.type === "video")?._count.type || 0,
    },
  };
}
