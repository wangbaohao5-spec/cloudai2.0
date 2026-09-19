import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteAssetForUser: vi.fn(),
  deleteFile: vi.fn(),
  hasHistoryForAsset: vi.fn(),
}));

vi.mock("@/lib/assets", () => ({ deleteAssetForUser: mocks.deleteAssetForUser }));
vi.mock("@/lib/history", () => ({ hasHistoryForAsset: mocks.hasHistoryForAsset }));
vi.mock("@/lib/storage", () => ({ deleteFile: mocks.deleteFile }));

import { cleanupGeneratedAssetAfterFailure } from "@/lib/generated-asset-cleanup";

describe("generated asset compensation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteAssetForUser.mockResolvedValue({ count: 1 });
    mocks.deleteFile.mockResolvedValue(undefined);
    mocks.hasHistoryForAsset.mockResolvedValue(false);
  });

  it("removes an unreferenced Asset before deleting its Storage object", async () => {
    await cleanupGeneratedAssetAfterFailure({
      assetId: "asset-1",
      logLabel: "test",
      storagePath: "user-1/image/result.png",
      userId: "user-1",
    });

    expect(mocks.deleteAssetForUser).toHaveBeenCalledWith("user-1", "asset-1");
    expect(mocks.deleteFile).toHaveBeenCalledWith("user-1/image/result.png");
  });

  it("keeps an Asset and object when History already references it", async () => {
    mocks.hasHistoryForAsset.mockResolvedValue(true);

    await cleanupGeneratedAssetAfterFailure({
      assetId: "asset-1",
      logLabel: "test",
      storagePath: "user-1/image/result.png",
      userId: "user-1",
    });

    expect(mocks.deleteAssetForUser).not.toHaveBeenCalled();
    expect(mocks.deleteFile).not.toHaveBeenCalled();
  });

  it("does not let cleanup failure replace the original route error", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.deleteAssetForUser.mockRejectedValue(new Error("cleanup failed"));

    await expect(cleanupGeneratedAssetAfterFailure({
      assetId: "asset-1",
      logLabel: "test",
      storagePath: "user-1/image/result.png",
      userId: "user-1",
    })).resolves.toBeUndefined();

    expect(mocks.deleteFile).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith("[generated-asset-cleanup] cleanup failed", expect.objectContaining({ stage: "asset-delete" }));
    warning.mockRestore();
  });
});
