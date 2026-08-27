import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    historyRecord: {
      findFirst: mocks.findFirst,
    },
  },
}));

import { hasProductAnalysisHistory } from "@/lib/first-product-onboarding-server";

describe("first product server detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("identifies a user with no product-analysis History as a first-product user", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(hasProductAnalysisHistory("user-1")).resolves.toBe(false);
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        type: "product-analysis",
      },
      select: {
        id: true,
      },
    });
  });

  it("identifies a user with product-analysis History as an existing user", async () => {
    mocks.findFirst.mockResolvedValue({ id: "analysis-1" });

    await expect(hasProductAnalysisHistory("user-1")).resolves.toBe(true);
  });
});
