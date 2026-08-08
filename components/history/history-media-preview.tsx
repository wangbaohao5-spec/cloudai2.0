"use client";

import type { HistoryRecord } from "@/lib/types";
import Image from "next/image";
import { useEffect, useState } from "react";

type HistoryMediaPreviewProps = {
  record: HistoryRecord;
  variant?: "thumbnail" | "detail";
};

type AssetUrlResponse = {
  url: string;
};

function isImagePreviewType(type: HistoryRecord["type"]) {
  return type === "image" || type === "image-enhance" || type === "product-analysis";
}

function getOutputUrl(output: unknown) {
  if (!output || typeof output !== "object") {
    return "";
  }

  const value = output as { imageUrl?: unknown; videoUrl?: unknown; url?: unknown };
  const directUrl = value.imageUrl || value.videoUrl || value.url;

  return typeof directUrl === "string" ? directUrl : "";
}

export function HistoryMediaPreview({ record, variant = "detail" }: HistoryMediaPreviewProps) {
  const [assetUrl, setAssetUrl] = useState("");
  const [assetError, setAssetError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const directUrl = getOutputUrl(record.output);
  const mediaUrl = assetUrl || directUrl;
  const shouldLoadAsset = Boolean(record.assetId);

  useEffect(() => {
    let isMounted = true;

    async function loadAssetUrl() {
      if (!shouldLoadAsset) {
        return;
      }

      try {
        const response = await fetch(`/api/assets/${record.assetId}/url`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("媒体预览加载失败");
        }

        const data = (await response.json()) as AssetUrlResponse;

        if (isMounted) {
          setAssetUrl(data.url);
          setAssetError("");
        }
      } catch (caughtError) {
        if (isMounted) {
          setAssetError(caughtError instanceof Error ? caughtError.message : "媒体预览加载失败");
        }
      }
    }

    void loadAssetUrl();

    return () => {
      isMounted = false;
    };
  }, [record.assetId, shouldLoadAsset]);

  if (!record.assetId && !directUrl) {
    return null;
  }

  return (
    <div className={`history-media-preview ${variant === "thumbnail" ? "compact" : ""}`}>
      {mediaUrl && isImagePreviewType(record.type) ? (
        <button type="button" onClick={() => setIsPreviewOpen(true)} aria-label="放大查看图片">
          <Image alt={record.title} height={variant === "thumbnail" ? 360 : 640} src={mediaUrl} unoptimized width={variant === "thumbnail" ? 540 : 960} />
        </button>
      ) : null}

      {mediaUrl && record.type === "video" ? (
        <video controls src={mediaUrl}>
          <track kind="captions" />
        </video>
      ) : null}

      {!mediaUrl && !assetError ? <p>正在加载媒体预览...</p> : null}
      {assetError ? <p>{assetError}</p> : null}

      {isPreviewOpen && mediaUrl ? (
        <div className="history-media-lightbox" role="dialog" aria-modal="true" aria-label="图片预览">
          <button type="button" onClick={() => setIsPreviewOpen(false)} aria-label="关闭图片预览" />
          <Image alt={record.title} height={900} src={mediaUrl} unoptimized width={1400} />
        </div>
      ) : null}
    </div>
  );
}
