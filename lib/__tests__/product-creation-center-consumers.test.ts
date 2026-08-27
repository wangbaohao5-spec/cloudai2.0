import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import { buildProductCreationCenterImageEditMarkdown, getProductCreationCenterImageEditAssets } from "@/lib/product-creation-center-image-edits";
import { describe, expect, it } from "vitest";

function imageEdits(imageUrl: string | null): ProductCreationCenterData["imageEdits"] {
  return [
    {
      id: "edit-1",
      assetId: "asset-edit-1",
      type: "image-enhance",
      title: "测试商品 图片编辑",
      input: { analysisHistoryId: "analysis-1", source: "product-image-edit" },
      output: { assetId: "asset-edit-1", provider: "test-provider" },
      originalUrl: imageUrl,
      previewUrl: null,
      imageUrl,
      createdAt: new Date().toISOString(),
    },
  ];
}

describe("Product Creation Center image-edit consumers", () => {
  it("provides the hydrated image-edit URL to the asset gallery DTO", () => {
    const [asset] = getProductCreationCenterImageEditAssets(imageEdits("https://storage.test/fresh-edit.png"));

    expect(asset.url).toBe("https://storage.test/fresh-edit.png");
  });

  it("includes the hydrated image-edit link in the product package", () => {
    const markdown = buildProductCreationCenterImageEditMarkdown(imageEdits("https://storage.test/fresh-edit.png"));

    expect(markdown).toContain("https://storage.test/fresh-edit.png");
    expect(markdown).not.toContain("暂无预览链接");
  });

  it("keeps image-edit media safely unavailable when hydration failed", () => {
    const records = imageEdits(null);
    const [asset] = getProductCreationCenterImageEditAssets(records);
    const markdown = buildProductCreationCenterImageEditMarkdown(records);

    expect(asset.url).toBe("");
    expect(markdown).toContain("暂无预览链接");
  });
});
