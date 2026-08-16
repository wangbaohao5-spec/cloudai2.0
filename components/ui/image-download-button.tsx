"use client";

import type { MouseEvent } from "react";
import { useState } from "react";

type ImageDownloadButtonProps = {
  className?: string;
  filename?: string;
  imageUrl: string;
  label?: string;
};

function getDateStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeFilename(value: string) {
  const normalized = value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  return normalized || "cloudai-image.png";
}

function getExtensionFromContentType(contentType: string) {
  if (contentType.includes("jpeg")) {
    return "jpg";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  if (contentType.includes("png")) {
    return "png";
  }

  return "";
}

function ensureExtension(filename: string, contentType?: string) {
  const extension = contentType ? getExtensionFromContentType(contentType) : "";

  if (extension) {
    return filename.replace(/\.(png|jpe?g|webp|gif|avif)$/i, "") + `.${extension}`;
  }

  if (/\.(png|jpe?g|webp|gif|avif)$/i.test(filename)) {
    return filename;
  }

  return `${filename}.${extension || "png"}`;
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function buildImageDownloadFilename(type: string, parts: Array<number | string | null | undefined> = []) {
  const safeParts = [type, ...parts]
    .map((part) => (part == null ? "" : sanitizeSegment(String(part))))
    .filter(Boolean);

  return sanitizeFilename(["cloudai", ...safeParts, getDateStamp()].join("-") + ".png");
}

export function ImageDownloadButton({ className = "", filename = "cloudai-image.png", imageUrl, label = "下载图片" }: ImageDownloadButtonProps) {
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleDownload(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (!imageUrl || isDownloading) {
      return;
    }

    setError("");
    setStatus("");
    setIsDownloading(true);

    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("download failed");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const nextFilename = ensureExtension(sanitizeFilename(filename), blob.type);

      triggerDownload(objectUrl, nextFilename);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setStatus("已下载");
      window.setTimeout(() => setStatus(""), 1600);
    } catch {
      setError("下载失败，请打开图片后手动保存。");
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <span className="image-download-control">
      <button className={`image-download-button ${className}`.trim()} type="button" disabled={isDownloading} onClick={(event) => void handleDownload(event)}>
        {isDownloading ? "下载中..." : status || label}
      </button>
      {error ? <span className="image-download-error">{error}</span> : null}
    </span>
  );
}
