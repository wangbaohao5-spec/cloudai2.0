import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    historyRecord: {
      deleteMany: mocks.deleteMany,
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  getFileUrl: vi.fn(),
  getImagePreviewUrlOrOriginal: vi.fn(),
}));

import { clearHistory, deleteHistory } from "@/lib/history";

describe("history clear safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteMany.mockResolvedValue({ count: 3 });
  });

  it("clears ordinary generation history while preserving product-analysis anchors", async () => {
    await expect(clearHistory("user-1")).resolves.toBe(3);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        type: {
          not: "product-analysis",
        },
      },
    });
  });

  it("keeps the operation scoped to the current user", async () => {
    await clearHistory("user-2");
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-2",
        type: {
          not: "product-analysis",
        },
      },
    });
  });

  it("also protects product-analysis anchors from single-record deletion", async () => {
    await expect(deleteHistory("user-1", "history-1")).resolves.toBe(3);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "history-1",
        userId: "user-1",
        type: {
          not: "product-analysis",
        },
      },
    });
  });
});
