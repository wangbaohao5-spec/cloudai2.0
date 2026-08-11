"use client";

import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { CopywritingResult, HistoryRecord } from "@/lib/types";
import { useMemo, useState } from "react";

type ProductContentPackageProps = {
  data: ProductCreationCenterData;
};

function isCopywritingResult(output: unknown): output is CopywritingResult {
  if (!output || typeof output !== "object") {
    return false;
  }

  const value = output as Partial<CopywritingResult>;

  return typeof value.title === "string" || Array.isArray(value.points) || typeof value.description === "string" || typeof value.shortVideoScript === "string";
}

function getOutputUrl(output: unknown) {
  if (!output || typeof output !== "object") {
    return "";
  }

  const value = output as { imageUrl?: unknown; url?: unknown };
  const url = value.imageUrl || value.url;

  return typeof url === "string" ? url : "";
}

function formatList(items?: string[]) {
  const visibleItems = items?.filter(Boolean) || [];

  return visibleItems.length ? visibleItems.map((item) => `- ${item}`).join("\n") : "- 暂无";
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "商品素材包";
}

function buildCopywritingMarkdown(records: HistoryRecord[]) {
  if (!records.length) {
    return "暂无生成文案";
  }

  return records
    .map((record, index) => {
      if (!isCopywritingResult(record.output)) {
        return [`### 文案 ${index + 1}`, `记录：${record.title}`, "内容格式暂无法识别"].join("\n\n");
      }

      return [
        `### 文案 ${index + 1}：${record.title}`,
        `标题：${record.output.title || "暂无"}`,
        "卖点：",
        formatList(record.output.points),
        `描述：${record.output.description || "暂无"}`,
        `短视频脚本：${record.output.shortVideoScript || "暂无"}`,
      ].join("\n\n");
    })
    .join("\n\n---\n\n");
}

function buildImageAssetMarkdown(label: string, records: Array<{ title: string; url: string }>) {
  if (!records.length) {
    return `### ${label}\n暂无`;
  }

  return [`### ${label}`, ...records.map((record, index) => [`${index + 1}. ${record.title}`, record.url ? `   预览链接：${record.url}` : "   暂无预览链接"].join("\n"))].join("\n");
}

function buildProductPackageMarkdown(data: ProductCreationCenterData) {
  const productName = data.analysis.productNameSuggestions[0] || data.product.title || "未命名商品";
  const originalAssets = data.originalAsset ? [{ title: data.originalAsset.name, url: data.originalAsset.url }] : [];
  const imageEditAssets = data.imageEdits.map((record) => ({
    title: record.title,
    url: getOutputUrl(record.output),
  }));
  const sceneImageAssets = data.sceneImages.map((record) => ({
    title: record.title,
    url: getOutputUrl(record.output),
  }));

  return [
    "# 商品素材包",
    "## 商品信息",
    `- 商品名称：${productName}`,
    `- 商品类别：${data.analysis.category || "暂无"}`,
    `- 目标用户：${data.analysis.targetAudience || "暂无"}`,
    "",
    "## AI 商品分析",
    "### 商品特点",
    formatList(data.analysis.features),
    "",
    "### 核心卖点",
    formatList(data.analysis.sellingPoints),
    "",
    "### 使用场景",
    formatList(data.analysis.scenes),
    "",
    "### 视觉风格",
    data.analysis.visualStyle || "暂无",
    "",
    "## 商品文案",
    buildCopywritingMarkdown(data.copywriting),
    "",
    "## 图片素材",
    buildImageAssetMarkdown("原商品图", originalAssets),
    "",
    buildImageAssetMarkdown("商品原图优化", imageEditAssets),
    "",
    buildImageAssetMarkdown("营销场景图", sceneImageAssets),
  ].join("\n");
}

export function ProductContentPackage({ data }: ProductContentPackageProps) {
  const [copied, setCopied] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const markdown = useMemo(() => buildProductPackageMarkdown(data), [data]);
  const productName = data.analysis.productNameSuggestions[0] || data.product.title || "商品";
  const copywritingCount = data.copywriting.length;
  const imageCount = Number(Boolean(data.originalAsset)) + data.imageEdits.length + data.sceneImages.length;

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  function handleDownload() {
    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `商品素材包-${sanitizeFileName(productName)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="product-content-package">
      <div className="product-creation-section-header">
        <div>
          <strong>商品素材包</strong>
          <span>AI 已生成内容整理</span>
        </div>
        <div className="product-content-package-actions">
          <button type="button" onClick={() => void handleCopy()}>
            {copied ? "已复制" : "复制全部内容"}
          </button>
          <button type="button" onClick={handleDownload}>
            下载 Markdown
          </button>
        </div>
      </div>

      <div className="product-content-package-summary" aria-label="商品素材包内容概览">
        <span>文案 {copywritingCount}</span>
        <span>图片素材 {imageCount}</span>
        <span>Markdown</span>
      </div>

      <div className="product-content-preview">
        <button type="button" onClick={() => setIsPreviewOpen((current) => !current)}>
          <span>{isPreviewOpen ? "▲" : "▼"}</span>
          查看素材包内容
        </button>
        {isPreviewOpen ? <pre>{markdown}</pre> : null}
      </div>
    </section>
  );
}
