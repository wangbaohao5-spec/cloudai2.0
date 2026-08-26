import { db } from "@/lib/db";
import { getRolling24HourUsageLimit, USAGE_TYPE_LABELS, USAGE_TYPES, type UsageType } from "@/lib/usage-limits";
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
  status: "pending" | "succeeded" | "refunded" | string;
  units: number;
  failureCode: string | null;
  createdAt: string;
  settledAt: string | null;
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
  usedLast24Hours: number;
  limitLast24Hours: number;
  remainingLast24Hours: number;
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
  const startOfRollingWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);
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
          gte: startOfRollingWindow,
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
  const startOfRollingWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const activeWhere = {
    userId,
    status: {
      in: [...ACTIVE_USAGE_STATUSES],
    },
  };
  const [rollingRows, recentRows] = await Promise.all([
    db.usageRecord.groupBy({
      by: ["type"],
      where: {
        ...activeWhere,
        createdAt: {
          gte: startOfRollingWindow,
        },
      },
      _sum: {
        units: true,
      },
    }),
    db.usageRecord.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        type: true,
        model: true,
        status: true,
        units: true,
        failureCode: true,
        createdAt: true,
        settledAt: true,
      },
    }),
  ]);

  return {
    generatedAt: now.toISOString(),
    summaries: USAGE_TYPES.map((type) => {
      const usedLast24Hours = rollingRows.find((row) => row.type === type)?._sum.units || 0;
      const limitLast24Hours = getRolling24HourUsageLimit(type);

      return {
        type,
        label: USAGE_TYPE_LABELS[type],
        usedLast24Hours,
        limitLast24Hours,
        remainingLast24Hours: Math.max(limitLast24Hours - usedLast24Hours, 0),
      };
    }),
    recentRecords: recentRows.map((record) => ({
      id: record.id,
      type: record.type as UsageType,
      model: record.model,
      status: record.status,
      units: record.units,
      failureCode: record.failureCode,
      createdAt: record.createdAt.toISOString(),
      settledAt: record.settledAt?.toISOString() || null,
    })),
  };
}
