"use client";

import { WorkspaceToast } from "@/components/ui/workspace-toast";
import { getRiskCategoryLabel } from "@/lib/ai/product-risk-labels";
import type { ProductContentRiskScanResult } from "@/lib/ai/product-content-risk-scanner";
import { formatCustomStructure, getImageSetPurposeLabel, getImageSetStructureModeLabel } from "@/lib/image-set-structure-labels";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import {
  formatProductOutputSettingsSummary,
  getOutputLanguageLabel,
  getOutputRatioLabel,
  getTargetMarketLabel,
  getTargetPlatformLabel,
  sanitizeProductOutputSettings,
} from "@/lib/product-output-settings";
import type { CopywritingResult, HistoryRecord } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProductContentPackageProps = {
  data: ProductCreationCenterData;
};

type RiskSummaryItem = {
  category: string;
  keyword: string;
  sources: Set<string>;
};

type ImageSetStructureSummary = {
  customStructure: string;
  generatedCount: number;
  purpose: string;
  structureMode: string;
};

function isCopywritingResult(output: unknown): output is CopywritingResult {
  if (!output || typeof output !== "object") {
    return false;
  }

  const value = output as Partial<CopywritingResult>;

  return typeof value.title === "string" || Array.isArray(value.points) || typeof value.description === "string" || typeof value.shortVideoScript === "string";
}

function isRiskScanResult(value: unknown): value is ProductContentRiskScanResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const riskScan = value as Partial<ProductContentRiskScanResult>;

  return typeof riskScan.level === "string" && Array.isArray(riskScan.matches);
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

function getLatestRecord(records: HistoryRecord[]) {
  return records.reduce<HistoryRecord | null>((latestRecord, record) => {
    if (!latestRecord) {
      return record;
    }

    return new Date(record.createdAt).getTime() > new Date(latestRecord.createdAt).getTime() ? record : latestRecord;
  }, null);
}

function getLatestOutputSettings(data: ProductCreationCenterData) {
  const records = [...data.copywriting, ...data.imageSetImages, ...data.detailPages, ...data.sceneImages, ...data.imageEdits].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  for (const record of records) {
    const inputSettings = sanitizeProductOutputSettings(getObjectField(record.input, "outputSettings"));
    const outputSettings = sanitizeProductOutputSettings(getObjectField(record.output, "outputSettings"));
    const settings = inputSettings || outputSettings;

    if (settings) {
      return settings;
    }
  }

  return null;
}

function getImageSetStructureSummary(records: HistoryRecord[]): ImageSetStructureSummary | null {
  const latestRecord = getLatestRecord(records);

  if (!latestRecord) {
    return null;
  }

  const customStructure = getObjectField(latestRecord.input, "customStructure");

  return {
    customStructure: formatCustomStructure(customStructure && typeof customStructure === "object" ? customStructure : null),
    generatedCount: records.length,
    purpose: getImageSetPurposeLabel(getStringField(latestRecord.input, "purpose")),
    structureMode: getImageSetStructureModeLabel(getStringField(latestRecord.input, "structureMode")),
  };
}

function formatList(items?: string[]) {
  const visibleItems = items?.filter(Boolean) || [];

  return visibleItems.length ? visibleItems.map((item) => `- ${item}`).join("\n") : "- 暂无";
}

function formatInlineList(items?: string[]) {
  const visibleItems = items?.filter(Boolean) || [];

  return visibleItems.length ? visibleItems.join("、") : "暂无";
}

function formatRiskScanMarkdown(riskScan: CopywritingResult["riskScan"]) {
  if (!riskScan || riskScan.level === "none") {
    return "";
  }

  const keywords = Array.isArray(riskScan.matches)
    ? Array.from(new Set(riskScan.matches.map((match) => match.keyword).filter(Boolean))).slice(0, 12)
    : [];

  if (!keywords.length) {
    return "";
  }

  return ["### 风险提示", "", "检测到可能需要确认的表述：", formatList(keywords)].join("\n");
}

function buildOutputSettingsMarkdown(data: ProductCreationCenterData) {
  const outputSettings = getLatestOutputSettings(data);

  if (!outputSettings) {
    return [
      "## 发布目标",
      "",
      "- 目标平台：未记录",
      "- 目标市场：未记录",
      "- 输出语言：未记录",
      "- 输出比例：未记录",
      "",
      "后续商品文案、详情页、套图和图片素材均会参考发布目标生成。",
    ].join("\n");
  }

  return [
    "## 发布目标",
    "",
    `- 目标平台：${getTargetPlatformLabel(outputSettings.targetPlatform)}`,
    `- 目标市场：${getTargetMarketLabel(outputSettings.targetMarket)}`,
    `- 输出语言：${getOutputLanguageLabel(outputSettings.outputLanguage)}`,
    `- 输出比例：${getOutputRatioLabel(outputSettings.outputRatio)}`,
    "",
    "后续商品文案、详情页、套图和图片素材均会参考该发布目标生成。",
  ].join("\n");
}

function collectRiskScanItems(records: HistoryRecord[], source: string, items: Map<string, RiskSummaryItem>) {
  records.forEach((record) => {
    const riskScan = getObjectField(record.output, "riskScan");

    if (!isRiskScanResult(riskScan) || riskScan.level === "none") {
      return;
    }

    riskScan.matches.forEach((match) => {
      if (!match.keyword) {
        return;
      }

      const category = match.category || "unknown";
      const key = `${category}:${match.keyword}`;
      const existingItem = items.get(key);

      if (existingItem) {
        existingItem.sources.add(source);
        return;
      }

      items.set(key, {
        category,
        keyword: match.keyword,
        sources: new Set([source]),
      });
    });
  });
}

function buildRiskSummaryMarkdown(data: ProductCreationCenterData) {
  const items = new Map<string, RiskSummaryItem>();

  collectRiskScanItems(data.copywriting, "商品文案", items);
  collectRiskScanItems(data.detailPages, "详情页规划", items);
  collectRiskScanItems(data.imageSetImages, "套图规划", items);

  const summaryItems = Array.from(items.values());

  if (!summaryItems.length) {
    return "";
  }

  return [
    "## 需要确认的表述",
    "",
    "检测到以下可能需要人工确认的商品表述，请在发布前核实：",
    "",
    summaryItems.map((item) => `- ${item.keyword}（${getRiskCategoryLabel(item.category)}；来源：${Array.from(item.sources).join("、")}）`).join("\n"),
  ].join("\n");
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

      const riskScanMarkdown = formatRiskScanMarkdown(record.output.riskScan);

      return [
        `### 文案 ${index + 1}：${record.title}`,
        `标题：${record.output.title || "暂无"}`,
        "卖点：",
        formatList(record.output.points),
        `描述：${record.output.description || "暂无"}`,
        `短视频脚本：${record.output.shortVideoScript || "暂无"}`,
        riskScanMarkdown,
      ]
        .filter(Boolean)
        .join("\n\n");
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

function getImageSetRecordIndex(record: HistoryRecord) {
  const image = getObjectField(record.output, "image") || getObjectField(record.input, "image");

  return getNumberField(record.input, "imageIndex") ?? getNumberField(image, "imageIndex");
}

function sortImageSetRecords(left: HistoryRecord, right: HistoryRecord) {
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

function buildImageSetMarkdown(records: HistoryRecord[]) {
  if (!records.length) {
    return "";
  }

  return [
    "",
    "## 商品套图",
    "",
    [...records]
      .sort(sortImageSetRecords)
      .map((record, index) => {
        const image = getObjectField(record.output, "image") || getObjectField(record.input, "image");
        const imageIndex = getNumberField(record.input, "imageIndex") ?? getNumberField(image, "imageIndex") ?? index + 1;
        const imageType = getStringField(record.input, "imageType") || getStringField(image, "imageType");
        const imageTypeLabel = IMAGE_SET_TYPE_LABELS[imageType] || imageType || "套图";
        const displayTypeLabel = imageIndex === 1 ? "主图点击图 / 首屏主视觉" : imageTypeLabel;
        const title = getStringField(image, "title") || record.title || "暂无";
        const headline = getStringField(image, "headline");
        const keyMessage = getStringField(image, "keyMessage");
        const visualDirection = getStringField(image, "visualDirection") || "暂无";
        const mustKeep = getStringArrayField(image, "mustKeep");
        const avoid = getStringArrayField(image, "avoid");
        const imageUrl = getOutputUrl(record.output);

        return [
          `### 第 ${imageIndex} 张：${displayTypeLabel}`,
          "",
          `- 图类型：${displayTypeLabel}`,
          imageIndex === 1 ? "- 主图说明：负责吸引点击并展示商品核心卖点。" : "",
          `- 标题：${title}`,
          `- 核心信息：${headline || keyMessage || "暂无"}`,
          `- 画面建议：${visualDirection}`,
          `- 必须保留：${formatInlineList(mustKeep)}`,
          `- 避免改动：${formatInlineList(avoid)}`,
          `- 图片链接：${imageUrl || "暂无"}`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n"),
  ].join("\n");
}

function buildImageSetStructureMarkdown(records: HistoryRecord[]) {
  const summary = getImageSetStructureSummary(records);

  if (!summary) {
    return "";
  }

  return [
    "",
    "## 商品套图结构",
    "",
    `- 套图用途：${summary.purpose}`,
    `- 结构模式：${summary.structureMode}`,
    summary.customStructure ? `- 图片结构：${summary.customStructure}` : "",
    "- 主图点击图：第 1 张，负责吸引点击并展示商品核心卖点。",
    `- 已生成：${summary.generatedCount} 张`,
  ]
    .filter(Boolean)
    .join("\n");
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
  const riskSummaryMarkdown = buildRiskSummaryMarkdown(data);

  return [
    "# 商品素材包",
    "## 商品信息",
    `- 商品名称：${productName}`,
    `- 商品类别：${data.analysis.category || "暂无"}`,
    `- 目标用户：${data.analysis.targetAudience || "暂无"}`,
    "",
    buildOutputSettingsMarkdown(data),
    "",
    "## 生成规范说明",
    "以下内容由 CloudAI 根据商品图片、商品分析结果和用户填写的生成要求辅助生成。发布或上架前，请人工确认品牌授权、材质、成分、功效、认证、检测报告、价格、销量、用户评价等信息真实、准确、可证明。",
    "",
    "CloudAI 默认会尽量避免主动生成未经确认的官方授权、正品保证、认证、医疗功效和绝对化宣传，但仍建议在正式使用前进行人工审核。",
    "",
    ...(riskSummaryMarkdown ? [riskSummaryMarkdown, ""] : []),
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
    buildImageAssetMarkdown("商品图精修", imageEditAssets),
    "",
    buildImageAssetMarkdown("营销场景图", sceneImageAssets),
    buildDetailPageMarkdown(data.detailPages),
    buildImageSetStructureMarkdown(data.imageSetImages),
    buildImageSetMarkdown(data.imageSetImages),
  ].join("\n");
}

function getDetailPageHref(analysisHistoryId?: string) {
  return analysisHistoryId ? `/dashboard/detail-page?analysis=${encodeURIComponent(analysisHistoryId)}` : "/dashboard/detail-page";
}

export function ProductContentPackage({ data }: ProductContentPackageProps) {
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const markdown = useMemo(() => buildProductPackageMarkdown(data), [data]);
  const productName = data.analysis.productNameSuggestions[0] || data.product.title || "商品";
  const copywritingCount = data.copywriting.length;
  const imageCount = Number(Boolean(data.originalAsset)) + data.imageEdits.length + data.sceneImages.length + data.detailPages.length + data.imageSetImages.length;
  const outputSettings = getLatestOutputSettings(data);

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
        <span>{outputSettings ? formatProductOutputSettingsSummary(outputSettings) : "发布目标未记录"}</span>
        <span>Markdown</span>
      </div>

      {!data.detailPages.length ? (
        <div className="product-content-package-detail-hint">
          <div>
            <strong>暂未生成详情页素材</strong>
            <p>需要详情页图片时，可前往详情页制作；这里的复制和下载内容不会受影响。</p>
          </div>
          <Link className="button secondary" href={getDetailPageHref(data.product.analysisHistoryId)}>
            前往详情页制作
          </Link>
        </div>
      ) : null}

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
