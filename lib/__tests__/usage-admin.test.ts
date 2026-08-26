import { describe, expect, it, vi } from "vitest";
import { listStalePendingUsage, refundPendingUsage } from "../../scripts/usage-admin.mjs";

describe("usage administration", () => {
  it("lists only stale pending usage", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const client = { usageRecord: { findMany } };
    const now = new Date("2026-08-26T12:00:00.000Z");

    await listStalePendingUsage(client, { now });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: "pending",
        createdAt: { lte: new Date("2026-08-26T11:00:00.000Z") },
      },
    }));
  });

  it("refunds a pending record without deleting it", async () => {
    const update = vi.fn().mockResolvedValue({ id: "usage-1", status: "refunded" });
    const tx = {
      usageRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: "usage-1", status: "pending", metadata: { route: "/api/chat", prompt: "secret" } }),
        update,
      },
    };
    const client = { $transaction: vi.fn(async (callback) => callback(tx)) };

    await refundPendingUsage(client, "usage-1");

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "refunded",
        failureCode: "INTERNAL_ERROR",
        settledAt: expect.any(Date),
        metadata: { route: "/api/chat", reconciliation: "manual-pending-refund" },
      }),
    }));
    expect(tx.usageRecord).not.toHaveProperty("delete");
  });

  it("rejects compensation of succeeded usage", async () => {
    const tx = {
      usageRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: "usage-1", status: "succeeded", metadata: null }),
        update: vi.fn(),
      },
    };
    const client = { $transaction: vi.fn(async (callback) => callback(tx)) };

    await expect(refundPendingUsage(client, "usage-1")).rejects.toThrow("Only pending usage");
    expect(tx.usageRecord.update).not.toHaveBeenCalled();
  });
});
