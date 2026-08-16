"use client";

import type { ProductCreationCenterAsset } from "@/lib/product-creation-center";
import type { HistoryRecord } from "@/lib/types";
import { buildImageDownloadFilename, ImageDownloadButton } from "@/components/ui/image-download-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useState } from "react";

type ProductAssetGalleryProps = {
  detailPages: HistoryRecord[];
  imageEdits: HistoryRecord[];
  imageSetImages: HistoryRecord[];
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

const IMAGE_SET_TYPE_LABELS: Record<string, string> = {
  "brand-story": "品牌故事图",
  comparison: "对比图",
  cta: "总结 / 购买理由图",
  "detail-closeup": "商品细节图",
  "four-grid-detail": "四宫格细节图",
  hero: "首屏主视觉",
  "model-wearing": "人物 / 模特图",
  "multi-angle": "多角度图",
  "selling-point": "核心卖点图",
  "size-spec": "尺寸 / 参数图",
  "usage-scene": "使用场景图",
  "white-background": "白底主图",
};

function getImageSetInfo(record: HistoryRecord) {
  const image = getObjectField(record.output, "image") || getObjectField(record.input, "image");
  const imageIndex = getNumberField(record.input, "imageIndex") ?? getNumberField(image, "imageIndex");
  const imageType = getStringField(record.input, "imageType") || getStringField(image, "imageType");
  const title = getStringField(image, "title");
  const headline = getStringField(image, "headline");
  const keyMessage = getStringField(image, "keyMessage");
  const typeLabel = IMAGE_SET_TYPE_LABELS[imageType] || imageType || "套图";

  return {
    label: imageIndex ? `第 ${imageIndex} 张` : "套图",
    title: [typeLabel, title || headline || keyMessage].filter(Boolean).join(" · ") || record.title,
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

export function ProductAssetGallery({ detailPages, imageEdits, imageSetImages, originalAsset, sceneImages }: ProductAssetGalleryProps) {
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
  const imageSetAssets = imageSetImages.map((record) => {
    const imageSetInfo = getImageSetInfo(record);

    return {
      downloadFilename: buildImageDownloadFilename("image-set", [imageSetInfo.label, imageSetInfo.title]),
      id: record.id,
      label: imageSetInfo.label,
      previewUrl: record.previewUrl,
      title: imageSetInfo.title,
      url: getOutputUrl(record.output),
    };
  });
  const totalAssets = originalAssets.length + imageEditAssets.length + sceneImageAssets.length + detailPageAssets.length + imageSetAssets.length;

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
        {imageSetAssets.length ? <AssetGroup assets={imageSetAssets} emptyText="" onPreview={setSelectedImage} title="商品套图" /> : null}
      </div>

      {selectedImage ? <ImageLightbox alt={selectedImage.alt} imageUrl={selectedImage.url} title={selectedImage.title} onClose={() => setSelectedImage(null)} /> : null}
    </div>
  );
}
