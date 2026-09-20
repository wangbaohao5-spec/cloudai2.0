import type { HistoryRecord } from "@/lib/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAssetForUser: vi.fn(),
  getHistoryRecordForUser: vi.fn(),
  getProductRelatedHistory: vi.fn(),
  hydrateHistoryAssetUrls: vi.fn(),
  isProductImageAnalysis: vi.fn(),
  getFileUrl: vi.fn(),
  getImagePreviewUrlOrOriginal: vi.fn(),
}));

vi.mock("@/lib/assets", () => ({ getAssetForUser: mocks.getAssetForUser }));
vi.mock("@/lib/history", () => ({
  getHistoryRecordForUser: mocks.getHistoryRecordForUser,
  getProductRelatedHistory: mocks.getProductRelatedHistory,
}));
vi.mock("@/lib/history-assets", () => ({ hydrateHistoryAssetUrls: mocks.hydrateHistoryAssetUrls }));
vi.mock("@/lib/product-copywriting", () => ({ isProductImageAnalysis: mocks.isProductImageAnalysis }));
vi.mock("@/lib/storage", () => ({
  getFileUrl: mocks.getFileUrl,
  getImagePreviewUrlOrOriginal: mocks.getImagePreviewUrlOrOriginal,
}));

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
    mocks.getFileUrl.mockResolvedValue("https://storage.test/original.png");
    mocks.getImagePreviewUrlOrOriginal.mockResolvedValue("https://storage.test/original-preview.png");
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

  it("classifies legacy and V2 detail-page assets for only the requested Product", async () => {
    const legacy = imageRecord("product-detail-page", "detail-legacy");
    const v2 = {
      ...imageRecord("detail-page-v2", "detail-v2"),
      input: {
        analysisHistoryId: "analysis-1",
        moduleType: "PRODUCT_DETAIL",
        sectionId: "section-4",
        source: "detail-page-v2",
      },
      output: { assetId: "asset-detail-v2", moduleType: "PRODUCT_DETAIL" },
    };
    const otherProduct = {
      ...imageRecord("detail-page-v2", "detail-other-product"),
      input: { analysisHistoryId: "analysis-2", moduleType: "HERO", source: "detail-page-v2" },
    };
    mocks.getProductRelatedHistory.mockResolvedValue([legacy, v2, otherProduct]);
    mocks.hydrateHistoryAssetUrls.mockResolvedValue([
      legacy,
      { ...v2, originalUrl: "https://storage.test/fresh-detail-v2.png", output: { ...v2.output, imageUrl: "https://storage.test/fresh-detail-v2.png" } },
      otherProduct,
    ]);

    const data = await getProductCreationCenterData("user-1", "analysis-1");

    expect(mocks.getProductRelatedHistory).toHaveBeenCalledWith({ userId: "user-1", analysisHistoryId: "analysis-1", sourceAssetId: "source-1" });
    expect(data.detailPages.map((record) => record.id)).toEqual(["detail-legacy", "detail-v2"]);
    expect(data.detailPages[1].input).toMatchObject({ moduleType: "PRODUCT_DETAIL", sectionId: "section-4" });
    expect(data.detailPages[1].output).toMatchObject({ imageUrl: "https://storage.test/fresh-detail-v2.png", moduleType: "PRODUCT_DETAIL" });
    expect(JSON.stringify(v2)).not.toContain("storage.test/fresh-detail-v2.png");
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

  it("keeps generated assets available when original image signing fails", async () => {
    const generatedRecord = imageRecord("product-image-set", "set-1");
    mocks.getAssetForUser.mockResolvedValue({ id: "source-1", type: "upload", name: "source.png", url: "user-1/upload/source.png" });
    mocks.getFileUrl.mockRejectedValue(new Error("storage unavailable"));
    mocks.getProductRelatedHistory.mockResolvedValue([generatedRecord]);
    mocks.hydrateHistoryAssetUrls.mockResolvedValue([generatedRecord]);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const data = await getProductCreationCenterData("user-1", "analysis-1");

    expect(data.originalAsset).toBeNull();
    expect(data.imageSetImages).toHaveLength(1);
    expect(warning).toHaveBeenCalledWith("[creation-center] original asset hydration failed", expect.objectContaining({ assetId: "source-1" }));
    warning.mockRestore();
  });
});
