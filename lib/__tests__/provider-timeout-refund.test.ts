import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  classifyUsageFailure: vi.fn().mockReturnValue("PROVIDER_ERROR"),
  refundUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/usage", () => ({
  classifyUsageFailure: mocks.classifyUsageFailure,
  refundUsage: mocks.refundUsage,
}));

import { ProviderTimeoutError } from "@/lib/ai/provider-http";
import { runReservedUsageTask } from "@/lib/usage-route";

describe("provider timeout usage lifecycle", () => {
  it("refunds a reservation when a provider times out", async () => {
    const timeout = new ProviderTimeoutError();
    await expect(runReservedUsageTask({
      logLabel: "timeout test",
      usageRecordId: "usage-1",
      userId: "user-1",
      task: async () => { throw timeout; },
    })).rejects.toBe(timeout);

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({
      usageRecordId: "usage-1",
      userId: "user-1",
      failureCode: "PROVIDER_ERROR",
    }));
  });
});
