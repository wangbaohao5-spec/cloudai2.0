"use client";

import type { ProductCreationCenterAsset } from "@/lib/product-creation-center";
import type { HistoryRecord } from "@/lib/types";

type ProductAssetGalleryProps = {
  imageEdits: HistoryRecord[];
  originalAsset: ProductCreationCenterAsset | null;
  sceneImages: HistoryRecord[];
};

function getOutputUrl(output: unknown) {
  if (!output || typeof output !== "object") {
    return "";
  }

  const value = output as { imageUrl?: unknown; url?: unknown };
  const url = value.imageUrl || value.url;

  return typeof url === "string" ? url : "";
}

function AssetTile({ label, title, url }: { label: string; title: string; url: string }) {
  return (
    <article className="product-asset-tile">
      <div>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={title} src={url} />
        ) : (
          <span>暂无预览</span>
        )}
      </div>
      <strong>{label}</strong>
      <p>{title}</p>
    </article>
  );
}

export function ProductAssetGallery({ imageEdits, originalAsset, sceneImages }: ProductAssetGalleryProps) {
  const generatedAssets = [
    ...imageEdits.map((record) => ({
      id: record.id,
      label: "原图优化",
      title: record.title,
      url: getOutputUrl(record.output),
    })),
    ...sceneImages.map((record) => ({
      id: record.id,
      label: "营销场景图",
      title: record.title,
      url: getOutputUrl(record.output),
    })),
  ];

  return (
    <div className="product-asset-gallery">
      <div className="product-asset-gallery-header">
        <strong>已生成素材</strong>
        <span>{generatedAssets.length} 个结果</span>
      </div>

      <div className="product-asset-grid">
        {originalAsset ? <AssetTile label="原商品图" title={originalAsset.name} url={originalAsset.url} /> : null}
        {generatedAssets.map((asset) => (
          <AssetTile key={asset.id} label={asset.label} title={asset.title} url={asset.url} />
        ))}
      </div>

      {!originalAsset && !generatedAssets.length ? <p className="product-asset-empty">完成商品分析后，这里会汇总原图、优化图和营销场景图。</p> : null}
    </div>
  );
}
