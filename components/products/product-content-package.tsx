"use client";

import { WorkspaceToast } from "@/components/ui/workspace-toast";
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

function formatList(items?: string[]) {
  const visibleItems = items?.filter(Boolean) || [];

  return visibleItems.length ? visibleItems.map((item) => `- ${item}`).join("\n") : "- 暂无";
}

function formatInlineList(items?: string[]) {
  const visibleItems = items?.filter(Boolean) || [];

  return visibleItems.length ? visibleItems.join("、") : "暂无";
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

function buildDetailPageMarkdown(records: HistoryRecord[]) {
  if (!records.length) {
    return "";
  }

  return [
    "",
    "## 商品详情页图片",
    "",
    records
      .map((record, index) => {
        const page = getObjectField(record.output, "page");
        const pageIndex = getNumberField(page, "pageIndex") ?? getNumberField(record.input, "pageIndex") ?? index + 1;
        const sectionTitle = getStringField(page, "sectionTitle") || "详情页";
        const headline = getStringField(page, "headline") || "暂无";
        const subheadline = getStringField(page, "subheadline") || "暂无";
        const sellingPoint = getStringField(page, "sellingPoint") || "暂无";
        const visualDirection = getStringField(page, "visualDirection") || "暂无";
        const bodyCopy = getStringField(page, "bodyCopy") || "暂无";
        const imageUrl = getOutputUrl(record.output);

        return [
          `### 第 ${pageIndex} 张：${sectionTitle}`,
          "",
          `- 标题：${headline}`,
          `- 副标题：${subheadline}`,
          `- 核心卖点：${sellingPoint}`,
          `- 画面建议：${visualDirection}`,
          `- 正文文案：${bodyCopy}`,
          `- 图片链接：${imageUrl || "暂无"}`,
        ].join("\n");
      })
      .join("\n\n"),
  ].join("\n");
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

function getStringArrayField(value: unknown, key: string) {
  const field = getObjectField(value, key);

  return Array.isArray(field) ? field.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function buildImageSetMarkdown(records: HistoryRecord[]) {
  if (!records.length) {
    return "";
  }

  return [
    "",
    "## 商品套图",
    "",
    records
      .map((record, index) => {
        const image = getObjectField(record.output, "image") || getObjectField(record.input, "image");
        const imageIndex = getNumberField(record.input, "imageIndex") ?? getNumberField(image, "imageIndex") ?? index + 1;
        const imageType = getStringField(record.input, "imageType") || getStringField(image, "imageType");
        const imageTypeLabel = IMAGE_SET_TYPE_LABELS[imageType] || imageType || "套图";
        const title = getStringField(image, "title") || record.title || "暂无";
        const headline = getStringField(image, "headline");
        const keyMessage = getStringField(image, "keyMessage");
        const visualDirection = getStringField(image, "visualDirection") || "暂无";
        const mustKeep = getStringArrayField(image, "mustKeep");
        const avoid = getStringArrayField(image, "avoid");
        const imageUrl = getOutputUrl(record.output);

        return [
          `### 第 ${imageIndex} 张：${imageTypeLabel}`,
          "",
          `- 图类型：${imageTypeLabel}`,
          `- 标题：${title}`,
          `- 核心信息：${headline || keyMessage || "暂无"}`,
          `- 画面建议：${visualDirection}`,
          `- 必须保留：${formatInlineList(mustKeep)}`,
          `- 避免改动：${formatInlineList(avoid)}`,
          `- 图片链接：${imageUrl || "暂无"}`,
        ].join("\n");
      })
      .join("\n\n"),
  ].join("\n");
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
    buildDetailPageMarkdown(data.detailPages),
    buildImageSetMarkdown(data.imageSetImages),
  ].join("\n");
}

export function ProductContentPackage({ data }: ProductContentPackageProps) {
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const markdown = useMemo(() => buildProductPackageMarkdown(data), [data]);
  const productName = data.analysis.productNameSuggestions[0] || data.product.title || "商品";
  const copywritingCount = data.copywriting.length;
  const imageCount = Number(Boolean(data.originalAsset)) + data.imageEdits.length + data.sceneImages.length + data.detailPages.length + data.imageSetImages.length;

  function showFeedback(message: string, tone: "error" | "success" = "success") {
    setFeedback({ message, tone });
    window.setTimeout(() => setFeedback(null), 2200);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown);
    showFeedback("复制成功");
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
    showFeedback("下载成功");
  }

  return (
    <section className="product-content-package">
      {feedback ? <WorkspaceToast message={feedback.message} tone={feedback.tone} /> : null}
      <div className="product-creation-section-header">
        <div>
          <strong>商品素材包</strong>
          <span>AI 已生成内容整理</span>
        </div>
        <div className="product-content-package-actions">
          <button type="button" onClick={() => void handleCopy()}>
            复制全部内容
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
          <span>{isPreviewOpen ? "▾" : "▸"}</span>
          查看素材包内容
        </button>
        {isPreviewOpen ? <pre>{markdown}</pre> : null}
      </div>
    </section>
  );
}
