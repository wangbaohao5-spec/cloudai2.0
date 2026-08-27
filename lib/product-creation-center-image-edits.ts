import type { ProductCreationCenterData } from "@/lib/product-creation-center";

export function getProductCreationCenterImageEditAssets(imageEdits: ProductCreationCenterData["imageEdits"]) {
  return imageEdits.map((record) => ({
    id: record.id,
    previewUrl: record.previewUrl,
    title: record.title,
    url: record.imageUrl || "",
  }));
}

export function buildProductCreationCenterImageEditMarkdown(imageEdits: ProductCreationCenterData["imageEdits"]) {
  const assets = getProductCreationCenterImageEditAssets(imageEdits);

  if (!assets.length) {
    return "### 商品图精修\n暂无";
  }

  return [
    "### 商品图精修",
    ...assets.map((asset, index) => [
      `${index + 1}. ${asset.title}`,
      asset.url ? `   预览链接：${asset.url}` : "   暂无预览链接",
    ].join("\n")),
  ].join("\n");
}
