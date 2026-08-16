"use client";

import type { ProductCreationCenterAsset } from "@/lib/product-creation-center";
import type { HistoryRecord } from "@/lib/types";
import { buildImageDownloadFilename, ImageDownloadButton } from "@/components/ui/image-download-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useState } from "react";

type ProductAssetGalleryProps = {
  detailPages: HistoryRecord[];
  imageEdits: HistoryRecord[];
  originalAsset: ProductCreationCenterAsset | null;
  sceneImages: HistoryRecord[];
};

type GalleryAsset = {
  downloadFilename: string;
  id: string;
  label: string;
  previewUrl?: string | null;
  title: string;
  url: string;
};

type SelectedImage = {
  alt: string;
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

function AssetTile({
  label,
  downloadFilename,
  onPreview,
  previewUrl,
  title,
  url,
}: {
  downloadFilename: string;
  label: string;
  onPreview: (image: SelectedImage) => void;
  previewUrl?: string | null;
  title: string;
  url: string;
}) {
  const displayUrl = previewUrl || url;
  const lightboxUrl = url || displayUrl;

  return (
    <article className="product-asset-tile">
      <div>
        {displayUrl ? (
          <button
            className="product-image-preview-button product-asset-preview-button"
            type="button"
            aria-label={`放大查看${title}`}
            onClick={() => onPreview({ alt: title, title: `${label} · ${title}`, url: lightboxUrl })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={title} decoding="async" loading="lazy" src={displayUrl} />
          </button>
        ) : (
          <span>暂无预览</span>
        )}
      </div>
      <strong>{label}</strong>
      <p>{title}</p>
      {lightboxUrl ? (
        <div className="product-asset-tile-actions">
          <ImageDownloadButton filename={downloadFilename} imageUrl={lightboxUrl} label="下载" />
        </div>
      ) : null}
    </article>
  );
}

function AssetGroup({
  assets,
  emptyText,
  onPreview,
  title,
}: {
  assets: GalleryAsset[];
  emptyText: string;
  onPreview: (image: SelectedImage) => void;
  title: string;
}) {
  return (
    <section className="product-asset-group">
      <div className="product-asset-group-header">
        <strong>{title}</strong>
        <span>{assets.length}</span>
      </div>
      {assets.length ? (
        <div className="product-asset-grid">
          {assets.map((asset) => (
            <AssetTile
              key={asset.id}
              downloadFilename={asset.downloadFilename}
              label={asset.label}
              onPreview={onPreview}
              previewUrl={asset.previewUrl}
              title={asset.title}
              url={asset.url}
            />
          ))}
        </div>
      ) : (
        <p className="product-asset-empty">{emptyText}</p>
      )}
    </section>
  );
}

export function ProductAssetGallery({ detailPages, imageEdits, originalAsset, sceneImages }: ProductAssetGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const originalAssets = originalAsset
    ? [
        {
          downloadFilename: buildImageDownloadFilename("original-product"),
          id: originalAsset.id,
          label: "原商品图",
          previewUrl: originalAsset.previewUrl,
          title: originalAsset.name,
          url: originalAsset.url,
        },
      ]
    : [];
  const imageEditAssets = imageEdits.map((record) => ({
    downloadFilename: buildImageDownloadFilename("image-edit", [record.title]),
    id: record.id,
    label: "原图优化",
    previewUrl: record.previewUrl,
    title: record.title,
    url: getOutputUrl(record.output),
  }));
  const sceneImageAssets = sceneImages.map((record) => ({
    downloadFilename: buildImageDownloadFilename("scene-image", [record.title]),
    id: record.id,
    label: "营销场景图",
    previewUrl: record.previewUrl,
    title: record.title,
    url: getOutputUrl(record.output),
  }));
  const detailPageAssets = detailPages.map((record) => {
    const detailPageInfo = getDetailPageInfo(record);

    return {
      downloadFilename: buildImageDownloadFilename("detail-page", [detailPageInfo.label, detailPageInfo.title]),
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
        <AssetGroup assets={originalAssets} emptyText="暂无原商品图。" onPreview={setSelectedImage} title="原图" />
        <AssetGroup assets={imageEditAssets} emptyText="还没有生成原图优化结果。" onPreview={setSelectedImage} title="优化图" />
        <AssetGroup assets={sceneImageAssets} emptyText="还没有生成营销场景图。" onPreview={setSelectedImage} title="场景图" />
        {detailPageAssets.length ? <AssetGroup assets={detailPageAssets} emptyText="" onPreview={setSelectedImage} title="商品详情页" /> : null}
      </div>

      {selectedImage ? <ImageLightbox alt={selectedImage.alt} imageUrl={selectedImage.url} title={selectedImage.title} onClose={() => setSelectedImage(null)} /> : null}
    </div>
  );
}
