"use client";

import type { ProductCreationCenterAsset, ProductCreationCenterData } from "@/lib/product-creation-center";
import { getProductCreationCenterImageEditAssets } from "@/lib/product-creation-center-image-edits";
import type { HistoryRecord } from "@/lib/types";
import { formatCustomStructure, getImageSetPurposeLabel, getImageSetStructureModeLabel } from "@/lib/image-set-structure-labels";
import { formatProductOutputSettingsSummary, sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import { buildImageDownloadFilename, ImageDownloadButton } from "@/components/ui/image-download-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import Link from "next/link";
import { useState } from "react";

type ProductAssetGalleryProps = {
  analysisHistoryId?: string;
  detailPages: HistoryRecord[];
  imageEdits: ProductCreationCenterData["imageEdits"];
  imageSetImages: HistoryRecord[];
  originalAsset: ProductCreationCenterAsset | null;
  sceneImages: HistoryRecord[];
};

type GalleryAsset = {
  downloadFilename: string;
  id: string;
  isHero?: boolean;
  label: string;
  lightboxTitle?: string;
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

type ImageSetDeliveryInfo = {
  customStructure: string;
  purpose: string;
  structureMode: string;
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

function getLatestRecord(records: HistoryRecord[]) {
  return records.reduce<HistoryRecord | null>((latestRecord, record) => {
    if (!latestRecord) {
      return record;
    }

    return new Date(record.createdAt).getTime() > new Date(latestRecord.createdAt).getTime() ? record : latestRecord;
  }, null);
}

function getLatestOutputSettings(records: HistoryRecord[]) {
  const sortedRecords = [...records].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  for (const record of sortedRecords) {
    const inputSettings = sanitizeProductOutputSettings(getObjectField(record.input, "outputSettings"));
    const outputSettings = sanitizeProductOutputSettings(getObjectField(record.output, "outputSettings"));
    const settings = inputSettings || outputSettings;

    if (settings) {
      return settings;
    }
  }

  return null;
}

function getLatestImageSetDeliveryInfo(records: HistoryRecord[]): ImageSetDeliveryInfo | null {
  const record = getLatestRecord(records);

  if (!record) {
    return null;
  }

  const customStructure = getObjectField(record.input, "customStructure");
  const structureMode = getStringField(record.input, "structureMode");

  return {
    customStructure: formatCustomStructure(customStructure && typeof customStructure === "object" ? customStructure : null),
    purpose: getImageSetPurposeLabel(getStringField(record.input, "purpose")),
    structureMode: getImageSetStructureModeLabel(structureMode),
  };
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
  const isHero = imageIndex === 1;

  return {
    imageIndex,
    isHero,
    label: imageIndex ? `第 ${imageIndex} 张` : "套图",
    lightboxTitle: isHero ? "第 1 张 · 主图点击图" : imageIndex ? `第 ${imageIndex} 张 · ${typeLabel}` : undefined,
    meta: typeLabel,
    title: [isHero ? "主图点击图" : typeLabel, title || headline || keyMessage].filter(Boolean).join(" · ") || record.title,
  };
}

function getImageSetRecordIndex(record: HistoryRecord) {
  const image = getObjectField(record.output, "image") || getObjectField(record.input, "image");

  return getNumberField(record.input, "imageIndex") ?? getNumberField(image, "imageIndex");
}

function sortImageSetAssetRecords(left: HistoryRecord, right: HistoryRecord) {
  const leftIndex = getImageSetRecordIndex(left);
  const rightIndex = getImageSetRecordIndex(right);

  if (leftIndex !== null && rightIndex !== null && leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  if (leftIndex !== null && rightIndex === null) {
    return -1;
  }

  if (leftIndex === null && rightIndex !== null) {
    return 1;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

function getDetailPageHref(analysisHistoryId?: string) {
  return analysisHistoryId ? `/dashboard/detail-page?analysis=${encodeURIComponent(analysisHistoryId)}` : "/dashboard/detail-page";
}

function AssetTile({
  label,
  downloadFilename,
  isHero,
  lightboxTitle,
  meta,
  onPreview,
  previewUrl,
  title,
  url,
}: {
  downloadFilename: string;
  isHero?: boolean;
  label: string;
  lightboxTitle?: string;
  meta?: string;
  onPreview: (image: SelectedImage) => void;
  previewUrl?: string | null;
  title: string;
  url: string;
}) {
  const displayUrl = previewUrl || url;
  const lightboxUrl = url || displayUrl;

  return (
    <article className="product-asset-tile product-asset-card cai-gallery-card">
      <div className="product-asset-media">
        {displayUrl ? (
          <button
            className="product-image-preview-button product-asset-preview-button"
            type="button"
            aria-label={`放大查看${title}`}
            onClick={() => onPreview({ alt: title, title: lightboxTitle || `${label} · ${title}`, url: lightboxUrl })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={title} decoding="async" loading="lazy" src={displayUrl} />
          </button>
        ) : (
          <span>暂无预览</span>
        )}
        <span className="product-asset-type-badge">{label}</span>
        {isHero ? <span className="product-asset-hero-badge">主图点击图</span> : null}
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
  actionHref,
  actionLabel,
  description,
  emptyText,
  notice,
  onPreview,
  sectionId,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  assets: GalleryAsset[];
  description: string;
  emptyText: string;
  notice?: string;
  onPreview: (image: SelectedImage) => void;
  sectionId?: string;
  title: string;
}) {
  return (
    <section className="product-asset-group product-asset-section" id={sectionId}>
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
              isHero={asset.isHero}
              label={asset.label}
              lightboxTitle={asset.lightboxTitle}
              meta={asset.meta}
              onPreview={onPreview}
              previewUrl={asset.previewUrl}
              title={asset.title}
              url={asset.url}
            />
          ))}
        </div>
      ) : (
        <div className="product-asset-empty">
          <p>{emptyText}</p>
          {actionHref && actionLabel ? (
            <Link className="button secondary" href={actionHref}>
              {actionLabel}
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function ProductAssetGallery({ analysisHistoryId, detailPages, imageEdits, imageSetImages, originalAsset, sceneImages }: ProductAssetGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const outputSettings = getLatestOutputSettings([...imageSetImages, ...detailPages, ...sceneImages, ...imageEdits]);
  const imageSetDeliveryInfo = getLatestImageSetDeliveryInfo(imageSetImages);
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
  const imageEditAssets = getProductCreationCenterImageEditAssets(imageEdits).map((asset) => ({
    ...asset,
    downloadFilename: buildImageDownloadFilename("image-edit", [asset.title]),
    label: "原图优化",
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
  const imageSetAssets = [...imageSetImages].sort(sortImageSetAssetRecords).map((record) => {
    const imageSetInfo = getImageSetInfo(record);

    return {
      downloadFilename: buildImageDownloadFilename("image-set", [imageSetInfo.label, imageSetInfo.title]),
      id: record.id,
      isHero: imageSetInfo.isHero,
      label: imageSetInfo.label,
      lightboxTitle: imageSetInfo.lightboxTitle,
      previewUrl: record.previewUrl,
      title: imageSetInfo.title,
      meta: imageSetInfo.meta,
      url: getOutputUrl(record.output),
    };
  });
  const totalAssets = originalAssets.length + imageEditAssets.length + sceneImageAssets.length + detailPageAssets.length + imageSetAssets.length;

  return (
    <div className="product-asset-gallery cai-panel">
      <div className="product-asset-gallery-header">
        <div>
          <strong>商品素材库</strong>
          <p>这里汇总当前商品生成的原图、优化图、场景图、详情页图和套图素材，可预览或下载单张图片。</p>
        </div>
        <span>{totalAssets ? `已生成 ${totalAssets} 张素材` : "等待素材生成"}</span>
      </div>
      {!totalAssets ? <p className="product-asset-gallery-helper">上传并分析商品后，生成的图片会自动汇总到这里。</p> : null}
      <div className="product-asset-delivery-meta">
        <strong>发布目标</strong>
        <span>{outputSettings ? formatProductOutputSettingsSummary(outputSettings) : "发布目标未记录"}</span>
        <p>这些素材会按当前发布目标进行整理和展示。</p>
      </div>

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
          emptyText="暂无优化图，可前往「原图优化」生成。"
          onPreview={setSelectedImage}
          title="优化图"
        />
        <AssetGroup
          assets={sceneImageAssets}
          description="用于营销场景、使用环境和氛围展示。"
          emptyText="暂无场景图素材。场景图能力已并入商品套图，历史场景图仍会显示在这里。"
          onPreview={setSelectedImage}
          title="场景图"
        />
        <AssetGroup
          actionHref={getDetailPageHref(analysisHistoryId)}
          actionLabel="前往详情页制作"
          assets={detailPageAssets}
          description="用于商品详情页的卖点、细节和购买理由展示。"
          emptyText="暂无详情页素材。你可以前往「详情页制作」为当前商品生成详情页图片。"
          onPreview={setSelectedImage}
          title="详情页图"
        />
        <AssetGroup
          assets={imageSetAssets}
          description="用于上架、详情页、社媒或平台 Listing 的成套图片。"
          emptyText="暂无商品套图，可前往「商品套图」生成。"
          notice={
            imageSetAssets.length
              ? [
                  "套图已生成，可单张预览或下载。后续可在「素材包」中汇总为商品素材包。",
                  imageSetDeliveryInfo
                    ? `套图信息：用途：${imageSetDeliveryInfo.purpose}；模式：${imageSetDeliveryInfo.structureMode}${
                        imageSetDeliveryInfo.customStructure ? `；结构：${imageSetDeliveryInfo.customStructure}` : ""
                      }。`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              : undefined
          }
          onPreview={setSelectedImage}
          sectionId="product-asset-section-image-set"
          title="商品套图"
        />
      </div>

      {selectedImage ? <ImageLightbox alt={selectedImage.alt} imageUrl={selectedImage.url} title={selectedImage.title} onClose={() => setSelectedImage(null)} /> : null}
    </div>
  );
}
