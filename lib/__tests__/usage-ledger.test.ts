import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  $executeRaw: vi.fn(),
  usageRecord: {
    aggregate: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    usageRecord: {
      findMany: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import {
  classifyUsageFailure,
  finalizeUsage,
  getStalePendingUsage,
  getUsageRequestId,
  refundUsage,
  reserveUsage,
  STALE_PENDING_USAGE_MS,
} from "@/lib/usage-ledger";

const transaction = db.$transaction as unknown as ReturnType<typeof vi.fn>;
const findMany = db.usageRecord.findMany as unknown as ReturnType<typeof vi.fn>;
const baseRecord = {
  id: "usage-1",
  userId: "user-1",
  type: "image",
  model: "image-model",
  status: "pending",
  requestId: "request-123",
  units: 1,
  settledAt: null,
  failureCode: null,
  metadata: null,
  createdAt: new Date("2026-08-26T00:00:00.000Z"),
};

function reservationInput(overrides: Partial<{ requestId: string; units: number }> = {}) {
  return {
    userId: "user-1",
    type: "image" as const,
    model: "image-model",
    requestId: overrides.requestId || "request-123",
    units: overrides.units,
  };
}

describe("usage ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    tx.$executeRaw.mockResolvedValue(0);
    tx.usageRecord.aggregate.mockResolvedValue({ _sum: { units: 0 } });
    tx.usageRecord.findFirst.mockResolvedValue(null);
    tx.usageRecord.create.mockResolvedValue(baseRecord);
    tx.usageRecord.update.mockImplementation(async ({ data }: { data: object }) => ({ ...baseRecord, ...data }));
    findMany.mockResolvedValue([]);
  });

  it("creates a pending reservation", async () => {
    const result = await reserveUsage(reservationInput());

    expect(result.created).toBe(true);
    expect(tx.usageRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "pending", units: 1, requestId: "request-123" }),
    }));
  });

  it("counts pending and succeeded units while excluding refunded records", async () => {
    await reserveUsage(reservationInput());

    for (const call of tx.usageRecord.aggregate.mock.calls) {
      expect(call[0].where.status.in).toEqual(["pending", "succeeded"]);
      expect(call[0]._sum).toEqual({ units: true });
    }
  });

  it("uses summed units for admission", async () => {
    tx.usageRecord.aggregate.mockResolvedValueOnce({ _sum: { units: 1 } });

    await expect(reserveUsage(reservationInput({ units: 2 }))).rejects.toMatchObject({ status: 429 });
    expect(tx.usageRecord.create).not.toHaveBeenCalled();
  });

  it.each(["pending", "succeeded", "refunded"])("does not duplicate an existing %s request", async (status) => {
    tx.usageRecord.findFirst.mockResolvedValueOnce({ ...baseRecord, status });

    const result = await reserveUsage(reservationInput());

    expect(result.created).toBe(false);
    expect(result.record).toMatchObject({ requestId: "request-123", status });
    expect(tx.usageRecord.create).not.toHaveBeenCalled();
  });

  it("holds the advisory lock before checking and creating", async () => {
    const order: string[] = [];
    tx.$executeRaw.mockImplementation(async () => order.push("lock"));
    tx.usageRecord.findFirst.mockImplementation(async () => {
      order.push("existing");
      return null;
    });
    tx.usageRecord.aggregate.mockImplementation(async () => {
      order.push("sum");
      return { _sum: { units: 0 } };
    });
    tx.usageRecord.create.mockImplementation(async () => {
      order.push("create");
      return baseRecord;
    });

    await reserveUsage(reservationInput());

    expect(order[0]).toBe("lock");
    expect(order.indexOf("lock")).toBeLessThan(order.indexOf("sum"));
    expect(order.indexOf("sum")).toBeLessThan(order.indexOf("create"));
  });

  it("rejects a second serialized reservation after the first consumes the limit", async () => {
    tx.usageRecord.aggregate.mockResolvedValueOnce({ _sum: { units: 1 } });

    await expect(reserveUsage(reservationInput({ units: 2 }))).rejects.toMatchObject({ status: 429 });
  });

  it("serializes concurrent reservations so only one can consume a one-unit limit", async () => {
    let usedUnits = 0;
    let lockTail = Promise.resolve();

    transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => {
      const previousLock = lockTail;
      let releaseLock!: () => void;
      lockTail = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      const localTx = {
        $executeRaw: vi.fn(async () => previousLock),
        usageRecord: {
          aggregate: vi.fn(async () => ({ _sum: { units: usedUnits } })),
          create: vi.fn(async ({ data }: { data: typeof baseRecord }) => {
            usedUnits += data.units;
            return { ...baseRecord, ...data };
          }),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      } as unknown as typeof tx;

      try {
        return await callback(localTx);
      } finally {
        releaseLock();
      }
    });

    const results = await Promise.allSettled([
      reserveUsage({ userId: "user-1", type: "video", model: "video-model", requestId: "request-concurrent-1" }),
      reserveUsage({ userId: "user-1", type: "video", model: "video-model", requestId: "request-concurrent-2" }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(usedUnits).toBe(1);
  });

  it("uses a rolling 24-hour window for reservation admission", async () => {
    const now = new Date("2026-08-26T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      await reserveUsage(reservationInput());
    } finally {
      vi.useRealTimers();
    }

    const windowStarts = tx.usageRecord.aggregate.mock.calls.map((call) => call[0].where.createdAt.gte.getTime());
    expect(windowStarts).toContain(now.getTime() - 24 * 60 * 60 * 1000);
  });

  it("finalizes pending usage", async () => {
    tx.usageRecord.findFirst.mockResolvedValueOnce(baseRecord);

    const result = await finalizeUsage({ usageRecordId: baseRecord.id, userId: baseRecord.userId });

    expect(result.status).toBe("succeeded");
    expect(tx.usageRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "succeeded", failureCode: null, settledAt: expect.any(Date) }),
    }));
  });

  it("finalize is idempotent for succeeded usage", async () => {
    tx.usageRecord.findFirst.mockResolvedValueOnce({ ...baseRecord, status: "succeeded" });

    await expect(finalizeUsage({ usageRecordId: baseRecord.id, userId: baseRecord.userId })).resolves.toMatchObject({ status: "succeeded" });
    expect(tx.usageRecord.update).not.toHaveBeenCalled();
  });

  it("does not finalize refunded usage", async () => {
    tx.usageRecord.findFirst.mockResolvedValueOnce({ ...baseRecord, status: "refunded" });

    await expect(finalizeUsage({ usageRecordId: baseRecord.id, userId: baseRecord.userId })).rejects.toMatchObject({ status: 409 });
  });

  it("refunds pending usage with a controlled code", async () => {
    tx.usageRecord.findFirst.mockResolvedValueOnce(baseRecord);

    const result = await refundUsage({
      usageRecordId: baseRecord.id,
      userId: baseRecord.userId,
      failureCode: "PROVIDER_ERROR",
    });

    expect(result).toMatchObject({ status: "refunded", failureCode: "PROVIDER_ERROR" });
  });

  it("refund is idempotent", async () => {
    tx.usageRecord.findFirst.mockResolvedValueOnce({ ...baseRecord, status: "refunded", failureCode: "PROVIDER_ERROR" });

    await expect(refundUsage({ usageRecordId: baseRecord.id, userId: baseRecord.userId, failureCode: "INTERNAL_ERROR" })).resolves.toMatchObject({
      status: "refunded",
      failureCode: "PROVIDER_ERROR",
    });
    expect(tx.usageRecord.update).not.toHaveBeenCalled();
  });

  it("does not automatically refund succeeded usage", async () => {
    tx.usageRecord.findFirst.mockResolvedValueOnce({ ...baseRecord, status: "succeeded" });

    await expect(refundUsage({ usageRecordId: baseRecord.id, userId: baseRecord.userId, failureCode: "INTERNAL_ERROR" })).rejects.toMatchObject({ status: 409 });
  });

  it("queries stale pending usage without automatically refunding it", async () => {
    const olderThan = new Date("2026-08-26T10:00:00.000Z");

    await getStalePendingUsage({ olderThan, userId: "user-1" });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "pending", createdAt: { lte: olderThan }, userId: "user-1" },
    }));
    expect(STALE_PENDING_USAGE_MS).toBe(60 * 60 * 1000);
    expect(tx.usageRecord.update).not.toHaveBeenCalled();
  });

  it("accepts a valid client request id and rejects malformed ids", () => {
    expect(getUsageRequestId(new Request("http://localhost", { headers: { "x-request-id": "client-request-123" } }))).toBe("client-request-123");
    expect(() => getUsageRequestId(new Request("http://localhost", { headers: { "x-request-id": "bad" } }))).toThrow();
  });

  it("generates a server request id when the client does not provide one", () => {
    expect(getUsageRequestId(new Request("http://localhost"))).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/);
  });

  it("classifies failures into controlled codes without persisting error details", () => {
    expect(classifyUsageFailure(new Error("request timed out with secret body"), "PROVIDER_ERROR")).toBe("PROVIDER_TIMEOUT");
    expect(classifyUsageFailure(new SyntaxError("Unexpected token"), "PROVIDER_ERROR")).toBe("PARSE_ERROR");
    expect(classifyUsageFailure(new Error("raw provider response"), "HISTORY_PERSIST_ERROR")).toBe("HISTORY_PERSIST_ERROR");
  });
});
