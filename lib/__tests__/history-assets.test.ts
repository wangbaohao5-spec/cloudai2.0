import type { HistoryRecord } from "@/lib/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getFileUrl: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    asset: {
      findMany: mocks.findMany,
    },
  },
}));
vi.mock("@/lib/storage", () => ({ getFileUrl: mocks.getFileUrl }));

import { hydrateHistoryAssetUrls } from "@/lib/history-assets";

function historyRecord({
  assetId = "asset-1",
  id = "history-1",
  imageUrl,
  source = "product-scene-image",
  type = "image",
}: {
  assetId?: string | null;
  id?: string;
  imageUrl?: string;
  source?: string;
  type?: HistoryRecord["type"];
} = {}): HistoryRecord {
  return {
    id,
    assetId,
    type,
    title: id,
    input: { source },
    output: {
      assetId,
      ...(imageUrl ? { imageUrl } : {}),
    },
    createdAt: new Date().toISOString(),
  };
}

describe("history asset hydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([{ id: "asset-1", url: "user-1/image/result.png" }]);
    mocks.getFileUrl.mockResolvedValue("https://storage.test/fresh-result.png");
  });

  it("hydrates an image edit that has an asset id but no persisted image URL", async () => {
    const [record] = await hydrateHistoryAssetUrls("user-1", [historyRecord({ type: "image-enhance", imageUrl: undefined })]);

    expect(record.output).toEqual(expect.objectContaining({ imageUrl: "https://storage.test/fresh-result.png" }));
  });

  it("replaces an expired scene image URL with a fresh URL", async () => {
    const [record] = await hydrateHistoryAssetUrls("user-1", [
      historyRecord({ imageUrl: "https://project.supabase.co/storage/v1/object/sign/cloudai-assets/old.png?token=expired" }),
    ]);

    expect(record.output).toEqual(expect.objectContaining({ imageUrl: "https://storage.test/fresh-result.png" }));
  });

  it("hydrates image-set and detail-page records with one ownership-scoped Asset query", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "asset-1", url: "user-1/image/set.png" },
      { id: "asset-2", url: "user-1/image/detail.png" },
    ]);
    mocks.getFileUrl
      .mockResolvedValueOnce("https://storage.test/set.png")
      .mockResolvedValueOnce("https://storage.test/detail.png");
    const records = await hydrateHistoryAssetUrls("user-1", [
      historyRecord({ id: "set-1", assetId: "asset-1", source: "product-image-set" }),
      historyRecord({ id: "detail-1", assetId: "asset-2", source: "product-detail-page" }),
    ]);

    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: "user-1",
        id: { in: ["asset-1", "asset-2"] },
      },
    }));
    expect(records.map((record) => (record.output as { imageUrl?: string }).imageUrl)).toEqual([
      "https://storage.test/set.png",
      "https://storage.test/detail.png",
    ]);
  });

  it("does not expose a stale URL when the Asset is missing or belongs to another user", async () => {
    mocks.findMany.mockResolvedValue([]);
    const [record] = await hydrateHistoryAssetUrls("user-1", [
      historyRecord({ imageUrl: "https://project.supabase.co/storage/v1/object/sign/cloudai-assets/private.png?token=old" }),
    ]);

    expect(record.output).not.toHaveProperty("imageUrl");
    expect(mocks.getFileUrl).not.toHaveBeenCalled();
  });

  it("soft-fails one signing error while hydrating the remaining records", async () => {
    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.findMany.mockResolvedValue([
      { id: "asset-1", url: "user-1/image/failed.png" },
      { id: "asset-2", url: "user-1/image/ok.png" },
    ]);
    mocks.getFileUrl.mockRejectedValueOnce(new Error("signing failed")).mockResolvedValueOnce("https://storage.test/ok.png");
    const records = await hydrateHistoryAssetUrls("user-1", [
      historyRecord({ id: "failed", assetId: "asset-1", imageUrl: "https://storage.test/old.png" }),
      historyRecord({ id: "ok", assetId: "asset-2" }),
    ]);

    expect(records[0].output).not.toHaveProperty("imageUrl");
    expect(records[1].output).toEqual(expect.objectContaining({ imageUrl: "https://storage.test/ok.png" }));
    expect(warningSpy).toHaveBeenCalledWith("[asset-hydration] signed URL generation failed", {
      assetId: "asset-1",
      errorName: "Error",
      historyId: "failed",
    });
    warningSpy.mockRestore();
  });

  it("preserves an unlinked legacy data URL", async () => {
    const dataUrl = "data:image/png;base64,legacy";
    const [record] = await hydrateHistoryAssetUrls("user-1", [historyRecord({ assetId: null, imageUrl: dataUrl, type: "image-enhance" })]);

    expect((record.output as { imageUrl?: string }).imageUrl).toBe(dataUrl);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("does not reuse an unlinked expired Supabase signed URL", async () => {
    const [record] = await hydrateHistoryAssetUrls("user-1", [
      historyRecord({ assetId: null, imageUrl: "https://project.supabase.co/storage/v1/object/sign/cloudai-assets/old.png?token=expired" }),
    ]);

    expect(record.output).not.toHaveProperty("imageUrl");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("does not sign the source Asset attached to a non-media history record", async () => {
    const record = historyRecord({ type: "copywriting" });
    const [hydrated] = await hydrateHistoryAssetUrls("user-1", [record]);

    expect(hydrated).toEqual(record);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.getFileUrl).not.toHaveBeenCalled();
  });
});
