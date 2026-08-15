"use client";

import type { ProductCreationCenterAsset } from "@/lib/product-creation-center";
import type { HistoryRecord } from "@/lib/types";

type ProductAssetGalleryProps = {
  detailPages: HistoryRecord[];
  imageEdits: HistoryRecord[];
  originalAsset: ProductCreationCenterAsset | null;
  sceneImages: HistoryRecord[];
};

type GalleryAsset = {
  id: string;
  label: string;
  previewUrl?: string | null;
  title: string;
  url: string;
};

function getOutputUrl(output: unknown) {
  if (!output || typeof output !== "object") {
    return "";
  }

  const value = output as { imageUrl?: unknown; url?: unknown };
  const url = value.imageUrl || value.url;

  return typeof url === "string" ? url : "";
}

function getObjectField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function getStringField(value: unknown, key: string) {
  const field = getObjectField(value, key);

  return typeof field === "string" ? field : "";
}

function getNumberField(value: unknown, key: string) {
  const field = getObjectField(value, key);

  return typeof field === "number" && Number.isFinite(field) ? field : null;
}

function getDetailPageInfo(record: HistoryRecord) {
  const page = getObjectField(record.output, "page");
  const pageIndex = getNumberField(page, "pageIndex") ?? getNumberField(record.input, "pageIndex");
  const sectionTitle = getStringField(page, "sectionTitle");
  const headline = getStringField(page, "headline");

  return {
    label: pageIndex ? `第 ${pageIndex} 张` : "详情页",
    title: [sectionTitle, headline].filter(Boolean).join(" · ") || record.title,
  };
}

function AssetTile({ label, previewUrl, title, url }: { label: string; previewUrl?: string | null; title: string; url: string }) {
  const displayUrl = previewUrl || url;

  return (
    <article className="product-asset-tile">
      <div>
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={title} decoding="async" loading="lazy" src={displayUrl} />
        ) : (
          <span>暂无预览</span>
        )}
      </div>
      <strong>{label}</strong>
      <p>{title}</p>
    </article>
  );
}

function AssetGroup({ assets, emptyText, title }: { assets: GalleryAsset[]; emptyText: string; title: string }) {
  return (
    <section className="product-asset-group">
      <div className="product-asset-group-header">
        <strong>{title}</strong>
        <span>{assets.length}</span>
      </div>
      {assets.length ? (
        <div className="product-asset-grid">
          {assets.map((asset) => (
            <AssetTile key={asset.id} label={asset.label} previewUrl={asset.previewUrl} title={asset.title} url={asset.url} />
          ))}
        </div>
      ) : (
        <p className="product-asset-empty">{emptyText}</p>
      )}
    </section>
  );
}

export function ProductAssetGallery({ detailPages, imageEdits, originalAsset, sceneImages }: ProductAssetGalleryProps) {
  const originalAssets = originalAsset
    ? [
        {
          id: originalAsset.id,
          label: "原商品图",
          previewUrl: originalAsset.previewUrl,
          title: originalAsset.name,
          url: originalAsset.url,
        },
      ]
    : [];
  const imageEditAssets = imageEdits.map((record) => ({
    id: record.id,
    label: "原图优化",
    previewUrl: record.previewUrl,
    title: record.title,
    url: getOutputUrl(record.output),
  }));
  const sceneImageAssets = sceneImages.map((record) => ({
    id: record.id,
    label: "营销场景图",
    previewUrl: record.previewUrl,
    title: record.title,
    url: getOutputUrl(record.output),
  }));
  const detailPageAssets = detailPages.map((record) => {
    const detailPageInfo = getDetailPageInfo(record);

    return {
      id: record.id,
      label: detailPageInfo.label,
      previewUrl: record.previewUrl,
      title: detailPageInfo.title,
      url: getOutputUrl(record.output),
    };
  });
  const totalAssets = originalAssets.length + imageEditAssets.length + sceneImageAssets.length + detailPageAssets.length;

  return (
    <div className="product-asset-gallery">
      <div className="product-asset-gallery-header">
        <strong>商品素材</strong>
        <span>{totalAssets} 个素材</span>
      </div>

      <div className="product-asset-groups">
        <AssetGroup assets={originalAssets} emptyText="暂无原商品图。" title="原图" />
        <AssetGroup assets={imageEditAssets} emptyText="还没有生成原图优化结果。" title="优化图" />
        <AssetGroup assets={sceneImageAssets} emptyText="还没有生成营销场景图。" title="场景图" />
        {detailPageAssets.length ? <AssetGroup assets={detailPageAssets} emptyText="" title="商品详情页" /> : null}
      </div>
    </div>
  );
}
