import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-errors";
import { db } from "@/lib/db";
import { USAGE_LIMITS, type UsageType } from "@/lib/usage-limits";

export const ACTIVE_USAGE_STATUSES = ["pending", "succeeded"] as const;
export const USAGE_FAILURE_CODES = [
  "PROVIDER_ERROR",
  "PROVIDER_TIMEOUT",
  "INVALID_PROVIDER_OUTPUT",
  "PARSE_ERROR",
  "STORAGE_ERROR",
  "ASSET_PERSIST_ERROR",
  "HISTORY_PERSIST_ERROR",
  "INTERNAL_ERROR",
] as const;
export const STALE_PENDING_USAGE_MS = 60 * 60 * 1000;

export type UsageFailureCode = (typeof USAGE_FAILURE_CODES)[number];
export type UsageMetadata = Record<string, string | number | boolean | null>;
export type UsageRecordInput = {
  userId: string;
  type: UsageType;
  model: string;
};
export type UsageReservationInput = UsageRecordInput & {
  requestId: string;
  units?: number;
  metadata?: UsageMetadata;
};
export type UsageSettlementInput = {
  usageRecordId: string;
  userId: string;
  metadata?: UsageMetadata;
};
export type UsageRefundInput = UsageSettlementInput & {
  failureCode: UsageFailureCode;
};

type UsageTransaction = Parameters<Parameters<typeof db.$transaction>[0]>[0];

function getRateLimitMessage(type: UsageType, retryAfterSeconds: number, windowSeconds: number) {
  if (windowSeconds >= 24 * 60 * 60) {
    return "过去 24 小时生成额度已达上限，请稍后再试。";
  }

  if (type === "video") {
    return `视频工坊任务正在排队保护中，请 ${retryAfterSeconds} 秒后再试。`;
  }

  return `请求过于频繁，请 ${retryAfterSeconds} 秒后再试。`;
}

function normalizeUsageUnits(units = 1) {
  if (!Number.isInteger(units) || units < 1) {
    throw new ApiError("Usage units must be a positive integer.", 400);
  }

  return units;
}

function toMetadata(metadata?: UsageMetadata): Prisma.InputJsonValue | undefined {
  return metadata as Prisma.InputJsonValue | undefined;
}

export async function lockUsageType(tx: UsageTransaction, userId: string, type: UsageType) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${type}))`;
}

async function lockUsageRecord(tx: UsageTransaction, usageRecordId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('usage-record'), hashtext(${usageRecordId}))`;
}

export async function assertUsageAvailable(tx: UsageTransaction, record: UsageRecordInput, units: number, now: Date) {
  for (const rule of USAGE_LIMITS[record.type]) {
    const windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);
    const usage = await tx.usageRecord.aggregate({
      where: {
        userId: record.userId,
        type: record.type,
        status: { in: [...ACTIVE_USAGE_STATUSES] },
        createdAt: { gte: windowStart },
      },
      _sum: { units: true },
    });
    const usedUnits = usage._sum.units || 0;

    if (usedUnits + units > rule.max) {
      const oldestRecordInWindow = await tx.usageRecord.findFirst({
        where: {
          userId: record.userId,
          type: record.type,
          status: { in: [...ACTIVE_USAGE_STATUSES] },
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: "asc" },
      });
      const oldestCreatedAt = oldestRecordInWindow?.createdAt || now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestCreatedAt.getTime() + rule.windowSeconds * 1000 - now.getTime()) / 1000));

      throw new ApiError(getRateLimitMessage(record.type, retryAfterSeconds, rule.windowSeconds), 429, {
        "Retry-After": String(retryAfterSeconds),
      });
    }
  }
}

export function getUsageRequestId(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim();

  if (!requestId) {
    return randomUUID();
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(requestId)) {
    throw new ApiError("Invalid request id.", 400);
  }

  return requestId;
}

export function classifyUsageFailure(error: unknown, fallback: UsageFailureCode): UsageFailureCode {
  if (fallback !== "PROVIDER_ERROR") {
    return fallback;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/timeout|timed out|ETIMEDOUT/i.test(message)) {
    return "PROVIDER_TIMEOUT";
  }

  if (/invalid json|JSON\.parse|Unexpected token|unterminated/i.test(message)) {
    return "PARSE_ERROR";
  }

  if (/empty response|没有返回|invalid output|可用图片/i.test(message)) {
    return "INVALID_PROVIDER_OUTPUT";
  }

  return fallback;
}

export async function reserveUsage(record: UsageReservationInput) {
  const now = new Date();
  const units = normalizeUsageUnits(record.units);

  return db.$transaction(async (tx) => {
    await lockUsageType(tx, record.userId, record.type);

    const existing = await tx.usageRecord.findFirst({
      where: { userId: record.userId, requestId: record.requestId },
    });

    if (existing) {
      return { created: false as const, record: existing };
    }

    await assertUsageAvailable(tx, record, units, now);

    const reservation = await tx.usageRecord.create({
      data: {
        userId: record.userId,
        type: record.type,
        model: record.model,
        status: "pending",
        requestId: record.requestId,
        units,
        metadata: toMetadata(record.metadata),
      },
    });

    return { created: true as const, record: reservation };
  });
}

export async function finalizeUsage(input: UsageSettlementInput) {
  try {
    return await db.$transaction(async (tx) => {
      await lockUsageRecord(tx, input.usageRecordId);
      const record = await tx.usageRecord.findFirst({
        where: { id: input.usageRecordId, userId: input.userId },
      });

      if (!record) {
        throw new ApiError("Usage reservation not found.", 404);
      }

      if (record.status === "succeeded") {
        return record;
      }

      if (record.status === "refunded") {
        throw new ApiError("Refunded usage cannot be finalized.", 409);
      }

      return tx.usageRecord.update({
        where: { id: record.id },
        data: {
          status: "succeeded",
          settledAt: new Date(),
          failureCode: null,
          ...(input.metadata ? { metadata: toMetadata(input.metadata) } : {}),
        },
      });
    });
  } catch (error) {
    let requestId: string | null = null;

    try {
      requestId = (await db.usageRecord.findFirst({
        where: { id: input.usageRecordId, userId: input.userId },
        select: { requestId: true },
      }))?.requestId || null;
    } catch {
      // Keep the original settlement error as the source of truth.
    }

    console.error("[usage] finalize failed; reservation remains pending", {
      errorName: error instanceof Error ? error.name : typeof error,
      requestId,
      route: typeof input.metadata?.route === "string" ? input.metadata.route : undefined,
      usageRecordId: input.usageRecordId,
    });
    throw error;
  }
}

export async function refundUsage(input: UsageRefundInput) {
  return db.$transaction(async (tx) => {
    await lockUsageRecord(tx, input.usageRecordId);
    const record = await tx.usageRecord.findFirst({
      where: { id: input.usageRecordId, userId: input.userId },
    });

    if (!record) {
      throw new ApiError("Usage reservation not found.", 404);
    }

    if (record.status === "refunded") {
      return record;
    }

    if (record.status === "succeeded") {
      throw new ApiError("Succeeded usage cannot be refunded automatically.", 409);
    }

    return tx.usageRecord.update({
      where: { id: record.id },
      data: {
        status: "refunded",
        settledAt: new Date(),
        failureCode: input.failureCode,
        ...(input.metadata ? { metadata: toMetadata(input.metadata) } : {}),
      },
    });
  });
}

export async function getStalePendingUsage({
  olderThan = new Date(Date.now() - STALE_PENDING_USAGE_MS),
  take = 100,
  userId,
}: {
  olderThan?: Date;
  take?: number;
  userId?: string;
} = {}) {
  return db.usageRecord.findMany({
    where: {
      status: "pending",
      createdAt: { lte: olderThan },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(take, 500)),
  });
}
