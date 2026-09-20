import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assetFindMany: vi.fn(),
  getHistoryRecordForUser: vi.fn(),
  getImagePreviewUrl: vi.fn(),
  getProductRelatedHistory: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    asset: {
      findMany: mocks.assetFindMany,
    },
  },
}));

vi.mock("@/lib/history", () => ({
  getHistoryRecordForUser: mocks.getHistoryRecordForUser,
  getProductRelatedHistory: mocks.getProductRelatedHistory,
}));

vi.mock("@/lib/storage", () => ({
  getImagePreviewUrl: mocks.getImagePreviewUrl,
}));

import {
  getDetailPageAssetCandidateForBinding,
  getDetailPageAssetCandidates,
  getSuggestedDetailPageModuleTypes,
} from "@/lib/detail-page-assets";

function historyRecord({
  analysisHistoryId = "analysis-a",
  assetId,
  historyId,
  imageType,
  source,
}: {
  analysisHistoryId?: string;
  assetId: string;
  historyId: string;
  imageType?: string;
  source: string;
}) {
  return {
    id: historyId,
    assetId,
    type: source === "product-image-edit" ? "image-enhance" : "image",
    title: "测试素材",
    input: { source, analysisHistoryId, ...(imageType ? { imageType } : {}) },
    output: {},
    createdAt: "2026-09-19T00:00:00.000Z",
  };
}

describe("detail page existing asset discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getHistoryRecordForUser.mockResolvedValue({
      id: "analysis-a",
      assetId: "asset-original",
      type: "product-analysis",
      title: "Product A",
      input: {},
      output: {},
      createdAt: "2026-09-18T00:00:00.000Z",
    });
    mocks.getProductRelatedHistory.mockResolvedValue([
      historyRecord({ assetId: "asset-scene", historyId: "history-scene", imageType: "usage-scene", source: "product-image-set" }),
      historyRecord({ assetId: "asset-scene", historyId: "history-scene-duplicate", imageType: "usage-scene", source: "product-image-set" }),
      historyRecord({ analysisHistoryId: "analysis-b", assetId: "asset-product-b", historyId: "history-b", source: "product-image-set" }),
    ]);
    mocks.assetFindMany.mockResolvedValue([
      { id: "asset-original", type: "upload", name: "original.png", url: "user-a/upload/original.png", createdAt: new Date("2026-09-18T00:00:00.000Z") },
      { id: "asset-scene", type: "image", name: "scene.png", url: "user-a/image/scene.png", createdAt: new Date("2026-09-19T00:00:00.000Z") },
    ]);
    mocks.getImagePreviewUrl.mockImplementation(async (path: string) => `https://storage.test/${path}`);
  });

  it("returns only same-product owned image candidates and dedupes repeated assets", async () => {
    const candidates = await getDetailPageAssetCandidates("user-a", "analysis-a");

    expect(candidates.map((candidate) => candidate.assetId)).toEqual(["asset-original", "asset-scene"]);
    expect(candidates[1]).toMatchObject({
      historyId: "history-scene",
      productRelationEvidence: "history-analysis-id",
      sourceType: "image-set",
      suggestedModuleTypes: ["USAGE_SCENE"],
    });
    expect(mocks.assetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-a",
          type: { in: ["image", "upload"] },
        }),
      }),
    );
    expect(candidates[1]).not.toHaveProperty("url");
  });

  it("excludes a malicious cross-product History record before the Asset query", async () => {
    await getDetailPageAssetCandidates("user-a", "analysis-a");
    const query = mocks.assetFindMany.mock.calls[0][0];

    expect(query.where.id.in).not.toContain("asset-product-b");
  });

  it("keeps a candidate available with a null preview when signing fails", async () => {
    mocks.getImagePreviewUrl.mockRejectedValue(new Error("signing failed"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const candidates = await getDetailPageAssetCandidates("user-a", "analysis-a");

    expect(candidates).toHaveLength(2);
    expect(candidates.every((candidate) => candidate.previewUrl === null)).toBe(true);
    expect(warning).toHaveBeenCalledTimes(2);
    warning.mockRestore();
  });

  it("validates one binding candidate without signing or querying unrelated Asset rows", async () => {
    mocks.assetFindMany.mockResolvedValue([
      { id: "asset-scene", type: "image", name: "scene.png", url: "user-a/image/scene.png", createdAt: new Date("2026-09-19T00:00:00.000Z") },
    ]);

    const candidate = await getDetailPageAssetCandidateForBinding("user-a", "analysis-a", "asset-scene");

    expect(candidate?.assetId).toBe("asset-scene");
    expect(candidate?.previewUrl).toBeNull();
    expect(mocks.getImagePreviewUrl).not.toHaveBeenCalled();
    expect(mocks.assetFindMany.mock.calls[0][0].where.id.in).toEqual(["asset-scene"]);
  });

  it("returns no binding candidate for another user's or another product's Asset", async () => {
    mocks.assetFindMany.mockResolvedValue([]);

    await expect(getDetailPageAssetCandidateForBinding("user-a", "analysis-a", "asset-product-b")).resolves.toBeNull();
  });

  it("only suggests modules from explicit metadata contracts", () => {
    expect(getSuggestedDetailPageModuleTypes("image-set", "hero")).toEqual(["HERO"]);
    expect(getSuggestedDetailPageModuleTypes("image-set", "usage-scene")).toEqual(["USAGE_SCENE"]);
    expect(getSuggestedDetailPageModuleTypes("image-edit", null)).toEqual([]);
    expect(getSuggestedDetailPageModuleTypes("product-image", "my-hero-looking-filename.png")).toEqual([]);
  });

  it("recovers V2 generated detail-page assets with module suggestions", async () => {
    mocks.getProductRelatedHistory.mockResolvedValue([
      historyRecord({ assetId: "asset-generated", historyId: "history-generated", imageType: "PRODUCT_DETAIL", source: "detail-page-v2" }),
    ]);
    mocks.assetFindMany.mockResolvedValue([
      { id: "asset-generated", type: "image", name: "detail.png", url: "user-a/image/detail.png", createdAt: new Date("2026-09-19T02:00:00.000Z") },
    ]);

    const candidates = await getDetailPageAssetCandidates("user-a", "analysis-a");

    expect(candidates[0]).toMatchObject({ sourceType: "detail-page", suggestedModuleTypes: ["PRODUCT_DETAIL"] });
  });
});
