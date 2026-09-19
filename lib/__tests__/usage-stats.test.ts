import { beforeEach, describe, expect, it, vi } from "vitest";

const usageRecord = vi.hoisted(() => ({
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { usageRecord } }));

import { getUsageCenterData } from "@/lib/usage";

describe("usage statistics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses unit sums for usage-center totals and excludes refunded records", async () => {
    usageRecord.groupBy.mockResolvedValue([{ type: "image", _sum: { units: 4 } }]);
    usageRecord.findMany.mockResolvedValue([
      {
        id: "legacy-1",
        type: "image",
        model: "legacy-model",
        status: "succeeded",
        units: 1,
        failureCode: null,
        createdAt: new Date("2026-08-26T00:00:00.000Z"),
        settledAt: new Date("2026-08-26T00:01:00.000Z"),
      },
      {
        id: "refunded-1",
        type: "image",
        model: "image-model",
        status: "refunded",
        units: 1,
        failureCode: "PROVIDER_ERROR",
        createdAt: new Date("2026-08-26T00:02:00.000Z"),
        settledAt: new Date("2026-08-26T00:03:00.000Z"),
      },
    ]);

    const center = await getUsageCenterData("user-1");

    expect(center.summaries.find((summary) => summary.type === "image")?.usedLast24Hours).toBe(4);
    expect(center.recentRecords.map((record) => record.status)).toEqual(["succeeded", "refunded"]);
    expect(usageRecord.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      _sum: { units: true },
      where: expect.objectContaining({ status: { in: ["pending", "succeeded"] } }),
    }));
    expect(usageRecord.findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
  });
});
