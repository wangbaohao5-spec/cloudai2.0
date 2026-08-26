import { db } from "@/lib/db";
import { getDailyUsageLimit, USAGE_TYPE_LABELS, USAGE_TYPES, type UsageType } from "@/lib/usage-limits";
import { ACTIVE_USAGE_STATUSES, assertUsageAvailable, lockUsageType, type UsageRecordInput } from "@/lib/usage-ledger";

export {
  ACTIVE_USAGE_STATUSES,
  STALE_PENDING_USAGE_MS,
  USAGE_FAILURE_CODES,
  classifyUsageFailure,
  finalizeUsage,
  getStalePendingUsage,
  getUsageRequestId,
  refundUsage,
  reserveUsage,
} from "@/lib/usage-ledger";
export type { UsageFailureCode, UsageMetadata, UsageRecordInput, UsageRefundInput, UsageReservationInput, UsageSettlementInput } from "@/lib/usage-ledger";

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

export async function recordUsage(record: UsageRecordInput) {
  return db.usageRecord.create({
    data: {
      userId: record.userId,
      type: record.type,
      model: record.model,
      status: "succeeded",
      units: 1,
      settledAt: new Date(),
    },
  });
}

export async function enforceUsageLimit(record: UsageRecordInput) {
  const now = new Date();

  return db.$transaction(async (tx) => {
    await lockUsageType(tx, record.userId, record.type);
    await assertUsageAvailable(tx, record, 1, now);
  });
}

export async function enforceUsageLimitAndRecord(record: UsageRecordInput) {
  const now = new Date();

  return db.$transaction(async (tx) => {
    await lockUsageType(tx, record.userId, record.type);
    await assertUsageAvailable(tx, record, 1, now);

    return tx.usageRecord.create({
      data: {
        userId: record.userId,
        type: record.type,
        model: record.model,
        status: "succeeded",
        units: 1,
        settledAt: now,
      },
    });
  });
}

export async function getUsageStats(userId: string): Promise<UsageStats> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeWhere = {
    userId,
    status: {
      in: [...ACTIVE_USAGE_STATUSES],
    },
  };
  const [today, month, total, byTypeRows] = await Promise.all([
    db.usageRecord.aggregate({
      where: {
        ...activeWhere,
        createdAt: {
          gte: startOfToday,
        },
      },
      _sum: {
        units: true,
      },
    }),
    db.usageRecord.aggregate({
      where: {
        ...activeWhere,
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        units: true,
      },
    }),
    db.usageRecord.aggregate({
      where: activeWhere,
      _sum: {
        units: true,
      },
    }),
    db.usageRecord.groupBy({
      by: ["type"],
      where: activeWhere,
      _sum: {
        units: true,
      },
    }),
  ]);

  return {
    today: today._sum.units || 0,
    month: month._sum.units || 0,
    total: total._sum.units || 0,
    byType: Object.fromEntries(
      USAGE_TYPES.map((type) => [type, byTypeRows.find((row) => row.type === type)?._sum.units || 0]),
    ) as UsageStats["byType"],
  };
}

export async function getUsageCenterData(userId: string): Promise<UsageCenterData> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const activeWhere = {
    userId,
    status: {
      in: [...ACTIVE_USAGE_STATUSES],
    },
  };
  const [todayRows, recentRows] = await Promise.all([
    db.usageRecord.groupBy({
      by: ["type"],
      where: {
        ...activeWhere,
        createdAt: {
          gte: startOfToday,
        },
      },
      _sum: {
        units: true,
      },
    }),
    db.usageRecord.findMany({
      where: activeWhere,
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
      const today = todayRows.find((row) => row.type === type)?._sum.units || 0;
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
