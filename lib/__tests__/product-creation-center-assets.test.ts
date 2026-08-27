import type { HistoryRecord } from "@/lib/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAssetForUser: vi.fn(),
  getHistoryRecordForUser: vi.fn(),
  getProductRelatedHistory: vi.fn(),
  hydrateHistoryAssetUrls: vi.fn(),
  isProductImageAnalysis: vi.fn(),
}));

vi.mock("@/lib/assets", () => ({ getAssetForUser: mocks.getAssetForUser }));
vi.mock("@/lib/history", () => ({
  getHistoryRecordForUser: mocks.getHistoryRecordForUser,
  getProductRelatedHistory: mocks.getProductRelatedHistory,
}));
vi.mock("@/lib/history-assets", () => ({ hydrateHistoryAssetUrls: mocks.hydrateHistoryAssetUrls }));
vi.mock("@/lib/product-copywriting", () => ({ isProductImageAnalysis: mocks.isProductImageAnalysis }));

import { getProductCreationCenterData } from "@/lib/product-creation-center";

function imageRecord(source: string, id: string): HistoryRecord {
  return {
    id,
    assetId: `asset-${id}`,
    type: source === "product-image-edit" ? "image-enhance" : "image",
    title: id,
    input: {
      analysisHistoryId: "analysis-1",
      source,
      ...(source === "product-image-edit" ? { sourceAssetId: "source-1" } : {}),
    },
    output: { imageUrl: `https://storage.test/${id}.png` },
    createdAt: new Date().toISOString(),
  };
}

describe("Product Creation Center asset hydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isProductImageAnalysis.mockReturnValue(true);
    mocks.getAssetForUser.mockResolvedValue(null);
    mocks.getHistoryRecordForUser.mockResolvedValue({
      id: "analysis-1",
      assetId: "source-1",
      type: "product-analysis",
      title: "测试商品",
      input: {},
      output: { category: "商品", productNameSuggestions: ["测试商品"] },
      createdAt: new Date().toISOString(),
    });
  });

  it("classifies and returns the hydrated records rather than raw History URLs", async () => {
    const rawRecords = [
      imageRecord("product-image-edit", "edit-1"),
      imageRecord("product-scene-image", "scene-1"),
      imageRecord("product-image-set", "set-1"),
      imageRecord("product-detail-page", "detail-1"),
    ];
    const hydratedRecords = rawRecords.map((record) => ({
      ...record,
      output: { imageUrl: `https://storage.test/fresh-${record.id}.png` },
      originalUrl: `https://storage.test/fresh-${record.id}.png`,
    }));
    mocks.getProductRelatedHistory.mockResolvedValue(rawRecords);
    mocks.hydrateHistoryAssetUrls.mockResolvedValue(hydratedRecords);

    const data = await getProductCreationCenterData("user-1", "analysis-1");

    expect(mocks.hydrateHistoryAssetUrls).toHaveBeenCalledWith("user-1", rawRecords);
    expect(data.imageEdits[0].imageUrl).toBe("https://storage.test/fresh-edit-1.png");
    expect(data.imageEdits[0].output).toEqual({ imageUrl: "https://storage.test/fresh-edit-1.png" });
    expect(data.sceneImages[0].output).toEqual({ imageUrl: "https://storage.test/fresh-scene-1.png" });
    expect(data.imageSetImages[0].output).toEqual({ imageUrl: "https://storage.test/fresh-set-1.png" });
    expect(data.detailPages[0].output).toEqual({ imageUrl: "https://storage.test/fresh-detail-1.png" });
  });

  it("maps an image edit with no persisted image URL to its fresh hydrated URL", async () => {
    const rawRecord = {
      ...imageRecord("product-image-edit", "edit-1"),
      output: { assetId: "asset-edit-1", provider: "test-provider" },
    };
    const hydratedRecord = {
      ...rawRecord,
      originalUrl: "https://storage.test/fresh-edit-1.png",
      output: {
        ...rawRecord.output,
        imageUrl: "https://storage.test/fresh-edit-1.png",
      },
    };
    mocks.getProductRelatedHistory.mockResolvedValue([rawRecord]);
    mocks.hydrateHistoryAssetUrls.mockResolvedValue([hydratedRecord]);

    const data = await getProductCreationCenterData("user-1", "analysis-1");

    expect(data.imageEdits).toHaveLength(1);
    expect(data.imageEdits[0].assetId).toBe("asset-edit-1");
    expect(data.imageEdits[0].imageUrl).toBe("https://storage.test/fresh-edit-1.png");
  });

  it("does not fall back to a persisted signed URL when image-edit hydration is unavailable", async () => {
    const rawRecord = {
      ...imageRecord("product-image-edit", "edit-1"),
      output: { imageUrl: "https://storage.test/expired-edit-1.png" },
    };
    const hydratedRecord = {
      ...rawRecord,
      originalUrl: null,
      previewUrl: null,
      output: {},
    };
    mocks.getProductRelatedHistory.mockResolvedValue([rawRecord]);
    mocks.hydrateHistoryAssetUrls.mockResolvedValue([hydratedRecord]);

    const data = await getProductCreationCenterData("user-1", "analysis-1");

    expect(data.imageEdits[0].imageUrl).toBeNull();
    expect(data.imageEdits[0].output).not.toHaveProperty("imageUrl");
  });
});
