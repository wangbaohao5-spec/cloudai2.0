import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-errors";

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

type UsageLimitRule = {
  windowSeconds: number;
  max: number;
};

const USAGE_LIMITS = {
  chat: [
    { windowSeconds: 10, max: 3 },
    { windowSeconds: 60, max: 12 },
    { windowSeconds: 24 * 60 * 60, max: 120 },
  ],
  copywriting: [
    { windowSeconds: 10, max: 2 },
    { windowSeconds: 60, max: 8 },
    { windowSeconds: 24 * 60 * 60, max: 100 },
  ],
  image: [
    { windowSeconds: 30, max: 2 },
    { windowSeconds: 60, max: 3 },
    { windowSeconds: 24 * 60 * 60, max: 30 },
  ],
  "image-enhance": [
    { windowSeconds: 60, max: 10 },
    { windowSeconds: 24 * 60 * 60, max: 100 },
  ],
  video: [
    { windowSeconds: 60, max: 1 },
    { windowSeconds: 24 * 60 * 60, max: 10 },
  ],
} satisfies Record<UsageRecord["type"], UsageLimitRule[]>;

function getRateLimitMessage(type: UsageRecord["type"], retryAfterSeconds: number, windowSeconds: number) {
  if (windowSeconds >= 24 * 60 * 60) {
    return "今日使用次数已达上限，请明天再试。";
  }

  if (type === "video") {
    return `视频生成任务正在排队保护中，请 ${retryAfterSeconds} 秒后再试。`;
  }

  return `请求过于频繁，请 ${retryAfterSeconds} 秒后再试。`;
}

export async function recordUsage(record: UsageRecordInput) {
  return db.usageRecord.create({
    data: {
      userId: record.userId,
      type: record.type,
      model: record.model,
    },
  });
}

export async function enforceUsageLimitAndRecord(record: UsageRecordInput) {
  const now = new Date();
  const rules = USAGE_LIMITS[record.type];

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${record.userId}), hashtext(${record.type}))`;

    for (const rule of rules) {
      const windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);
      const count = await tx.usageRecord.count({
        where: {
          userId: record.userId,
          type: record.type,
          createdAt: {
            gte: windowStart,
          },
        },
      });

      if (count >= rule.max) {
        const oldestRecordInWindow = await tx.usageRecord.findFirst({
          where: {
            userId: record.userId,
            type: record.type,
            createdAt: {
              gte: windowStart,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });
        const oldestCreatedAt = oldestRecordInWindow?.createdAt || now;
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((oldestCreatedAt.getTime() + rule.windowSeconds * 1000 - now.getTime()) / 1000),
        );

        throw new ApiError(getRateLimitMessage(record.type, retryAfterSeconds, rule.windowSeconds), 429, {
          "Retry-After": String(retryAfterSeconds),
        });
      }
    }

    return tx.usageRecord.create({
      data: {
        userId: record.userId,
        type: record.type,
        model: record.model,
      },
    });
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
