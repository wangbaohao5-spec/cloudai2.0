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
  meta?: string;
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
    meta: typeLabel,
    title: [typeLabel, title || headline || keyMessage].filter(Boolean).join(" · ") || record.title,
  };
}

function AssetTile({
  label,
  downloadFilename,
  meta,
  onPreview,
  previewUrl,
  title,
  url,
}: {
  downloadFilename: string;
  label: string;
  meta?: string;
  onPreview: (image: SelectedImage) => void;
  previewUrl?: string | null;
  title: string;
  url: string;
}) {
  const displayUrl = previewUrl || url;
  const lightboxUrl = url || displayUrl;

  return (
    <article className="product-asset-tile product-asset-card">
      <div className="product-asset-media">
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
        <span className="product-asset-type-badge">{label}</span>
        {lightboxUrl ? (
          <div className="product-asset-download" onClick={(event) => event.stopPropagation()}>
            <ImageDownloadButton className="product-asset-download-button" filename={downloadFilename} imageUrl={lightboxUrl} label="下载" />
          </div>
        ) : null}
      </div>
      <div className="product-asset-meta">
        <strong>{label}</strong>
        <p>{title}</p>
        {meta ? <span>{meta}</span> : null}
      </div>
    </article>
  );
}

function AssetGroup({
  assets,
  description,
  emptyText,
  notice,
  onPreview,
  title,
}: {
  assets: GalleryAsset[];
  description: string;
  emptyText: string;
  notice?: string;
  onPreview: (image: SelectedImage) => void;
  title: string;
}) {
  return (
    <section className="product-asset-group product-asset-section">
      <div className="product-asset-group-header product-asset-section-header">
        <div>
          <strong>{title}</strong>
          <p className="product-asset-section-description">{description}</p>
        </div>
        <span className="product-asset-section-count">{assets.length}</span>
      </div>
      {notice ? <p className="product-asset-section-notice">{notice}</p> : null}
      {assets.length ? (
        <div className="product-asset-grid">
          {assets.map((asset) => (
            <AssetTile
              key={asset.id}
              downloadFilename={asset.downloadFilename}
              label={asset.label}
              meta={asset.meta}
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
      meta: imageSetInfo.meta,
      url: getOutputUrl(record.output),
    };
  });
  const totalAssets = originalAssets.length + imageEditAssets.length + sceneImageAssets.length + detailPageAssets.length + imageSetAssets.length;

  return (
    <div className="product-asset-gallery">
      <div className="product-asset-gallery-header">
        <div>
          <strong>商品素材库</strong>
          <p>这里汇总当前商品生成的原图、优化图、场景图、详情页图和套图素材，可预览或下载单张图片。</p>
        </div>
        <span>{totalAssets ? `已生成 ${totalAssets} 张素材` : "等待素材生成"}</span>
      </div>
      {!totalAssets ? <p className="product-asset-gallery-helper">上传并分析商品后，生成的图片会自动汇总到这里。</p> : null}

      <div className="product-asset-groups">
        <AssetGroup
          assets={originalAssets}
          description="商品分析和生成任务的基础图片。"
          emptyText="暂无原商品图。"
          onPreview={setSelectedImage}
          title="原商品图"
        />
        <AssetGroup
          assets={imageEditAssets}
          description="用于保留商品主体的基础美化与电商展示。"
          emptyText="暂无优化图，可前往「图片」Tab 生成。"
          onPreview={setSelectedImage}
          title="优化图"
        />
        <AssetGroup
          assets={sceneImageAssets}
          description="用于营销场景、使用环境和氛围展示。"
          emptyText="暂无场景图，可前往「场景」Tab 生成。"
          onPreview={setSelectedImage}
          title="场景图"
        />
        <AssetGroup
          assets={detailPageAssets}
          description="用于商品详情页的卖点、细节和购买理由展示。"
          emptyText="暂无详情页图，可前往「详情页」Tab 生成。"
          onPreview={setSelectedImage}
          title="详情页图"
        />
        <AssetGroup
          assets={imageSetAssets}
          description="用于上架、详情页、社媒或平台 Listing 的成套图片。"
          emptyText="暂无商品套图，可前往「套图」Tab 生成。"
          notice={imageSetAssets.length ? "套图已生成，可单张预览或下载。后续可在「导出」Tab 汇总为商品素材包。" : undefined}
          onPreview={setSelectedImage}
          title="商品套图"
        />
      </div>

      {selectedImage ? <ImageLightbox alt={selectedImage.alt} imageUrl={selectedImage.url} title={selectedImage.title} onClose={() => setSelectedImage(null)} /> : null}
    </div>
  );
}
