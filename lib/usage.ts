import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-errors";
import { getDailyUsageLimit, USAGE_LIMITS, USAGE_TYPE_LABELS, USAGE_TYPES, type UsageType } from "@/lib/usage-limits";

export type UsageRecord = {
  id: string;
  type: UsageType;
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

export type UsageCenterSummary = {
  type: UsageType;
  label: string;
  today: number;
  dailyLimit: number;
  remainingToday: number;
};

export type UsageCenterData = {
  generatedAt: string;
  summaries: UsageCenterSummary[];
  recentRecords: UsageRecord[];
};

function getRateLimitMessage(type: UsageRecord["type"], retryAfterSeconds: number, windowSeconds: number) {
  if (windowSeconds >= 24 * 60 * 60) {
    return "今日生成额度已达上限，请明天再试。";
  }

  if (type === "video") {
    return `视频工坊任务正在排队保护中，请 ${retryAfterSeconds} 秒后再试。`;
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

export async function enforceUsageLimit(record: UsageRecordInput) {
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
    byType: Object.fromEntries(
      USAGE_TYPES.map((type) => [type, byTypeRows.find((row) => row.type === type)?._count.type || 0]),
    ) as UsageStats["byType"],
  };
}

export async function getUsageCenterData(userId: string): Promise<UsageCenterData> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [todayRows, recentRows] = await Promise.all([
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
    db.usageRecord.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        type: true,
        model: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    generatedAt: now.toISOString(),
    summaries: USAGE_TYPES.map((type) => {
      const today = todayRows.find((row) => row.type === type)?._count.type || 0;
      const dailyLimit = getDailyUsageLimit(type);

      return {
        type,
        label: USAGE_TYPE_LABELS[type],
        today,
        dailyLimit,
        remainingToday: Math.max(dailyLimit - today, 0),
      };
    }),
    recentRecords: recentRows.map((record) => ({
      id: record.id,
      type: record.type as UsageType,
      model: record.model,
      createdAt: record.createdAt.toISOString(),
    })),
  };
}
