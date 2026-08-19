"use client";

import { ProductImageSetPlanPreview, type ProductImageSetImageResult } from "@/components/products/product-image-set-plan-preview";
import { ProductGenerationCostHint } from "@/components/products/product-generation-cost-hint";
import { ProductRiskScanAlert } from "@/components/products/product-risk-scan-alert";
import { AiThinkingLoading } from "@/components/ui/loading";
import type {
  ProductImageSetCustomStructure,
  ProductImageSetPlan,
  ProductImageSetPlanImage,
  ProductImageSetPurpose,
  ProductImageSetSmartCount,
  ProductImageSetStructureMode,
} from "@/lib/ai/product-image-set-plan-prompt-builder";
import type { ImageSetStructureValidationResult } from "@/lib/ai/product-image-set-structure-validation";
import { getImageSetCostEstimate } from "@/lib/product-generation-cost";
import { formatProductOutputSettingsSummary } from "@/lib/product-output-settings";
import type { ProductAnalysisResponse, ProductGenerationBrief, ProductOutputSettings } from "@/lib/product-types";
import { useState } from "react";

type ProductImageSetPanelProps = {
  analysisResult: ProductAnalysisResponse | null;
  generationBrief?: ProductGenerationBrief | null;
  outputSettings?: ProductOutputSettings | null;
  onGenerated?: () => void;
  onOpenRiskConfirmations?: () => void;
  onViewAssets?: () => void;
};

type BatchProgress = {
  completed: number;
  failed: number;
  total: number;
};

type ProductRiskScan = {
  level: "none" | "low" | "medium" | "high";
  matches?: Array<{
    category: string;
    keyword: string;
    level: string;
  }>;
  summary?: string;
};

type ProductImageSetPlanResponse = ProductImageSetPlan & {
  customStructure?: ProductImageSetCustomStructure | null;
  riskScan?: ProductRiskScan;
  structureMode?: ProductImageSetStructureMode;
  structureValidation?: ImageSetStructureValidationResult;
};

const purposeOptions: Array<{ description: string; label: string; structure: string[]; value: ProductImageSetPurpose }> = [
  {
    value: "quick-listing",
    label: "快速上架",
    description: "适合主图、卖点图、场景图、细节图，快速生成商品上架素材。",
    structure: ["白底图", "卖点图", "场景图", "细节图"],
  },
  {
    value: "detail-page",
    label: "详情页套图",
    description: "适合首屏主视觉、核心卖点、使用场景、商品细节和购买理由。",
    structure: ["主视觉", "卖点图", "场景图", "细节图", "总结图"],
  },
  {
    value: "social-seeding",
    label: "社媒种草",
    description: "适合小红书、抖音、朋友圈等内容种草场景。",
    structure: ["氛围图", "人物使用图", "生活方式图", "短文案图"],
  },
  {
    value: "platform-listing",
    label: "平台 Listing",
    description: "适合 Amazon / Shopee / TikTok Shop 等跨境或平台商品图。",
    structure: ["白底图", "多角度图", "参数图", "使用场景图"],
  },
];

const countOptions: Array<{ description: string; label: string; value: ProductImageSetSmartCount }> = [
  { value: 3, label: "3 张", description: "快速测试" },
  { value: 5, label: "5 张", description: "基础套图" },
  { value: 7, label: "7 张", description: "常见商品套图" },
  { value: 8, label: "8 张", description: "完整结构" },
];

const structureModeOptions: Array<{ description: string; label: string; value: ProductImageSetStructureMode }> = [
  { value: "smart", label: "智能匹配", description: "CloudAI 自动规划每张图类型。" },
  { value: "custom", label: "自定义配置", description: "手动设置不同图片类型数量。" },
];

const customStructureOptions: Array<{ key: keyof ProductImageSetCustomStructure; label: string }> = [
  { key: "whiteBackground", label: "白底图" },
  { key: "usageScene", label: "场景图" },
  { key: "sellingPoint", label: "卖点图" },
  { key: "detailCloseup", label: "细节图" },
  { key: "other", label: "其他" },
];

const customStructureDescriptions: Record<string, string> = {
  detailCloseup: "展示材质、结构或局部细节",
  other: "尺寸、对比、参数或补充图",
  sellingPoint: "突出核心卖点",
  usageScene: "展示使用场景和氛围",
  whiteBackground: "适合主图和商品基础展示",
};

const customStructureDefaults = {
  3: { detailCloseup: 0, other: 0, sellingPoint: 1, usageScene: 1, whiteBackground: 1 },
  5: { detailCloseup: 1, other: 0, sellingPoint: 2, usageScene: 1, whiteBackground: 1 },
  7: { detailCloseup: 1, other: 1, sellingPoint: 2, usageScene: 2, whiteBackground: 1 },
  8: { detailCloseup: 2, other: 1, sellingPoint: 2, usageScene: 2, whiteBackground: 1 },
} satisfies Record<ProductImageSetSmartCount, ProductImageSetCustomStructure>;

function getPurposeLabel(value: ProductImageSetPurpose) {
  return purposeOptions.find((option) => option.value === value)?.label || "商品套图";
}

function getDefaultCustomStructure(count: ProductImageSetSmartCount): ProductImageSetCustomStructure {
  return {
    comparison: 0,
    sizeSpec: 0,
    ...customStructureDefaults[count],
  };
}

function getCustomStructureTotal(structure: ProductImageSetCustomStructure) {
  return Object.values(structure).reduce((total, value) => total + (typeof value === "number" ? value : 0), 0);
}

function formatCustomStructure(structure: ProductImageSetCustomStructure | null) {
  if (!structure) {
    return "";
  }

  return customStructureOptions
    .map((option) => {
      const value = structure[option.key] || 0;
      return value ? `${option.label} ${value}` : "";
    })
    .filter(Boolean)
    .join(" / ");
}

function ImageSetStructureValidationNotice({
  structureValidation,
}: {
  structureValidation?: ImageSetStructureValidationResult | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!structureValidation || structureValidation.status === "not-needed") {
    return null;
  }

  return (
    <div className={`product-image-set-structure-validation ${structureValidation.status}`.trim()}>
      <div className="product-image-set-structure-validation-main">
        <div>
          <strong>{structureValidation.summary}</strong>
          <span>
            期望 {structureValidation.totalExpected} 张 / 实际 {structureValidation.totalActual} 张。你可以继续生成，也可以重新生成套图规划。
          </span>
        </div>
        {structureValidation.items.length ? (
          <button className="button secondary" type="button" onClick={() => setIsOpen((current) => !current)}>
            {isOpen ? "收起结构详情" : "查看结构详情"}
          </button>
        ) : null}
      </div>
      {isOpen && structureValidation.items.length ? (
        <div className="product-image-set-structure-validation-items">
          {structureValidation.items.map((item) => (
            <span className={item.expected === item.actual ? "is-matched" : "is-different"} key={item.key}>
              {item.label}：期望 {item.expected} / 实际 {item.actual}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProductImageSetPanel({ analysisResult, generationBrief, outputSettings, onGenerated, onOpenRiskConfirmations, onViewAssets }: ProductImageSetPanelProps) {
  const [count, setCount] = useState<ProductImageSetSmartCount>(7);
  const [customStructure, setCustomStructure] = useState<ProductImageSetCustomStructure>(() => getDefaultCustomStructure(7));
  const [error, setError] = useState("");
  const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, string>>({});
  const [imageResults, setImageResults] = useState<Record<number, ProductImageSetImageResult>>({});
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({ completed: 0, failed: 0, total: 0 });
  const [isGeneratingSet, setIsGeneratingSet] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [plan, setPlan] = useState<ProductImageSetPlan | null>(null);
  const [plannedCustomStructure, setPlannedCustomStructure] = useState<ProductImageSetCustomStructure | null>(null);
  const [plannedOutputSettings, setPlannedOutputSettings] = useState<ProductOutputSettings | null>(null);
  const [plannedStructureMode, setPlannedStructureMode] = useState<ProductImageSetStructureMode>("smart");
  const [purpose, setPurpose] = useState<ProductImageSetPurpose>("detail-page");
  const [riskScan, setRiskScan] = useState<ProductRiskScan | null>(null);
  const [structureValidation, setStructureValidation] = useState<ImageSetStructureValidationResult | null>(null);
  const [structureMode, setStructureMode] = useState<ProductImageSetStructureMode>("smart");
  const customStructureTotal = getCustomStructureTotal(customStructure);
  const planCount = structureMode === "custom" ? customStructureTotal : count;
  const isCustomStructureValid = structureMode === "smart" || (customStructureTotal >= 1 && customStructureTotal <= 12);
  const customStructureWarning =
    structureMode === "custom" && customStructureTotal > 12
      ? "当前最多支持 12 张，请减少部分类型数量。"
      : structureMode === "custom" && customStructureTotal < 1
        ? "当前至少需要 1 张，请增加一种图片类型。"
        : "";
  const remainingImages = plan?.images.filter((image) => !imageResults[image.imageIndex]).sort((left, right) => left.imageIndex - right.imageIndex) || [];
  const failedImages = plan?.images.filter((image) => !imageResults[image.imageIndex] && Boolean(imageErrors[image.imageIndex])).sort((left, right) => left.imageIndex - right.imageIndex) || [];
  const generatedCount = plan ? plan.images.length - remainingImages.length : 0;
  const failedCount = failedImages.length;
  const pendingCount = Math.max(remainingImages.length - failedCount, 0);
  const imageSetCostEstimate = plan ? getImageSetCostEstimate(remainingImages.length) : null;
  const retryFailedCostEstimate = failedCount ? getImageSetCostEstimate(failedCount) : null;
  const isFullSetGenerated = Boolean(plan?.images.length) && remainingImages.length === 0;
  const hasAnyGeneratedImage = generatedCount > 0;
  const batchStatusTone = failedCount ? "warning" : isFullSetGenerated ? "complete" : "";

  function getFullSetButtonLabel() {
    if (isGeneratingSet) {
      return "正在生成...";
    }

    if (isFullSetGenerated) {
      return "整套已完成";
    }

    if (hasAnyGeneratedImage || failedCount) {
      return "继续生成剩余图片";
    }

    return "生成整套";
  }

  function getSummaryMessage() {
    if (!plan) {
      return "";
    }

    if (isGeneratingSet && generatingImageIndex) {
      return `正在生成第 ${generatingImageIndex} / ${plan.images.length} 张`;
    }

    if (failedCount) {
      return `部分图片生成失败，可只重试 ${failedCount} 个失败项。`;
    }

    if (isFullSetGenerated) {
      return "整套已完成，可在素材中查看、预览和下载。";
    }

    return "先规划，再生成。每张图片都有明确任务，减少重复和无效生成。";
  }

  function handleCountChange(nextCount: ProductImageSetSmartCount) {
    setCount(nextCount);
    if (structureMode === "custom") {
      setCustomStructure(getDefaultCustomStructure(nextCount));
    }
    setPlan(null);
    setPlannedCustomStructure(null);
    setPlannedOutputSettings(null);
    setPlannedStructureMode(structureMode);
    setRiskScan(null);
    setStructureValidation(null);
    setImageErrors({});
    setImageResults({});
    setBatchProgress({ completed: 0, failed: 0, total: 0 });
  }

  function handleStructureModeChange(nextMode: ProductImageSetStructureMode) {
    setStructureMode(nextMode);
    setError("");
  }

  function updateCustomStructure(key: keyof ProductImageSetCustomStructure, delta: number) {
    setCustomStructure((current) => ({
      ...current,
      [key]: Math.min(Math.max((current[key] || 0) + delta, 0), 12),
    }));
  }

  async function handleGeneratePlan() {
    if (!analysisResult?.historyId) {
      setError("请先完成商品分析，再生成套图规划。");
      return;
    }

    if (!isCustomStructureValid) {
      setError(customStructureWarning || "请调整自定义结构数量后再生成规划。");
      return;
    }

    setError("");
    setRiskScan(null);
    setStructureValidation(null);
    setIsPlanning(true);

    try {
      const response = await fetch("/api/products/image-set/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: analysisResult.historyId,
          count: planCount,
          customStructure: structureMode === "custom" ? customStructure : undefined,
          generationBrief: generationBrief || undefined,
          outputSettings: outputSettings || undefined,
          purpose,
          structureMode,
        }),
      });

      if (!response.ok) {
        throw new Error("生成套图规划失败，请稍后重试。");
      }

      const data = (await response.json()) as ProductImageSetPlanResponse;

      setPlan({
        count: data.count,
        images: Array.isArray(data.images) ? data.images : [],
        purpose: data.purpose,
      });
      setPlannedCustomStructure(structureMode === "custom" ? customStructure : null);
      setPlannedOutputSettings(outputSettings || null);
      setPlannedStructureMode(structureMode);
      setRiskScan(data.riskScan || null);
      setStructureValidation(data.structureValidation || null);
      setImageErrors({});
      setImageResults({});
      setBatchProgress({ completed: 0, failed: 0, total: 0 });
    } catch {
      setError("生成套图规划失败，请稍后重试。");
    } finally {
      setIsPlanning(false);
    }
  }

  async function generateOneImage({
    failureMessage,
    image,
    refreshOnSuccess,
  }: {
    failureMessage?: string;
    image: ProductImageSetPlanImage;
    refreshOnSuccess: boolean;
  }) {
    if (!analysisResult?.historyId) {
      setImageErrors((current) => ({
        ...current,
        [image.imageIndex]: "请先完成商品分析，再生成套图图片。",
      }));
      return false;
    }

    const isRegeneration = Boolean(imageResults[image.imageIndex]);

    setGeneratingImageIndex(image.imageIndex);
    setImageErrors((current) => {
      const next = { ...current };
      delete next[image.imageIndex];
      return next;
    });

    try {
      const response = await fetch("/api/products/image-set/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: analysisResult.historyId,
          count: plan?.count || planCount,
          generationBrief: generationBrief || undefined,
          generationMode: image.suggestedGenerationMode || "faithful",
          image,
          outputSettings: outputSettings || undefined,
          purpose,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        const isUnavailable = errorData?.error?.toLowerCase().includes("unavailable") || response.status === 503;

        throw new Error(isUnavailable ? "图片生成模型当前繁忙，请稍后重试。" : "生成这张套图失败，请稍后重试。");
      }

      const data = (await response.json()) as ProductImageSetImageResult;

      setImageResults((current) => ({
        ...current,
        [image.imageIndex]: data,
      }));
      if (refreshOnSuccess) {
        onGenerated?.();
      }
      return true;
    } catch (caughtError) {
      const fallbackMessage = failureMessage || (isRegeneration ? "重新生成失败，请稍后重试。" : "生成这张套图失败，请稍后重试。");
      const message =
        caughtError instanceof Error && caughtError.message.includes("繁忙")
          ? caughtError.message
          : caughtError instanceof Error && !isRegeneration
            ? caughtError.message
            : fallbackMessage;

      setImageErrors((current) => ({
        ...current,
        [image.imageIndex]: message,
      }));
      return false;
    } finally {
      setGeneratingImageIndex(null);
    }
  }

  async function handleGenerateImage(image: ProductImageSetPlanImage) {
    await generateOneImage({ image, refreshOnSuccess: true });
  }

  async function handleGenerateFullSet() {
    if (!plan || !remainingImages.length || isGeneratingSet) {
      return;
    }

    setError("");
    setIsGeneratingSet(true);
    setBatchProgress({ completed: 0, failed: 0, total: remainingImages.length });

    let failed = 0;
    let completed = 0;

    for (const image of remainingImages) {
      const isSuccess = await generateOneImage({
        failureMessage: "生成失败，请稍后重试。",
        image,
        refreshOnSuccess: false,
      });

      completed += 1;
      failed += isSuccess ? 0 : 1;
      setBatchProgress({ completed, failed, total: remainingImages.length });
    }

    setIsGeneratingSet(false);
    onGenerated?.();
  }

  async function handleRetryFailedImages() {
    if (!plan || !failedImages.length || isGeneratingSet) {
      return;
    }

    setError("");
    setIsGeneratingSet(true);
    setBatchProgress({ completed: 0, failed: 0, total: failedImages.length });

    let failed = 0;
    let completed = 0;

    for (const image of failedImages) {
      const isSuccess = await generateOneImage({
        failureMessage: "重新生成失败，请稍后重试。",
        image,
        refreshOnSuccess: false,
      });

      completed += 1;
      failed += isSuccess ? 0 : 1;
      setBatchProgress({ completed, failed, total: failedImages.length });
    }

    setIsGeneratingSet(false);
    onGenerated?.();
  }

  if (!analysisResult) {
    return (
      <section className="product-image-set-panel glass-card">
        <p className="eyebrow">Image Set</p>
        <h2>商品套图规划</h2>
        <p className="image-generation-intro">完成商品分析后，CloudAI 可以根据商品卖点和目标用途规划一组商品图片结构。</p>
      </section>
    );
  }

  return (
    <section className="product-image-set-panel glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Image Set</p>
          <h2>商品套图规划</h2>
          <p className="image-generation-intro">根据商品分析、卖点要求和目标用途，规划一组适合上架、详情页或社媒使用的商品图片。</p>
        </div>
        <span>只生成规划</span>
      </div>

      <div className="product-image-set-config product-image-set-settings">
        <fieldset>
          <legend>结构模式</legend>
          <div className="product-image-set-mode-switch" role="group" aria-label="套图结构模式">
            {structureModeOptions.map((option) => (
              <button
                className={structureMode === option.value ? "active" : undefined}
                key={option.value}
                type="button"
                onClick={() => handleStructureModeChange(option.value)}
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {structureMode === "smart" ? (
          <>
            <fieldset>
              <legend>套图用途</legend>
              <div className="product-image-set-purpose-grid">
                {purposeOptions.map((option) => (
                  <label className={`product-image-set-purpose-card ${purpose === option.value ? "is-active active" : ""}`.trim()} key={option.value}>
                    <input checked={purpose === option.value} name="imageSetPurpose" type="radio" value={option.value} onChange={() => setPurpose(option.value)} />
                    <span className="product-image-set-purpose-card-header">
                      <strong>{option.label}</strong>
                      {purpose === option.value ? <em>当前选择</em> : null}
                    </span>
                    <span>{option.description}</span>
                    <span className="product-image-set-purpose-structure" aria-label={`${option.label}推荐结构`}>
                      {option.structure.slice(0, 4).map((item) => (
                        <i key={item}>{item}</i>
                      ))}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>套图数量</legend>
              <div className="product-image-set-count-options product-image-set-count-grid">
                {countOptions.map((option) => (
                  <label className={`product-image-set-count-option ${count === option.value ? "is-active active" : ""}`.trim()} key={option.value}>
                    <input checked={count === option.value} name="imageSetCount" type="radio" value={option.value} onChange={() => handleCountChange(option.value)} />
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <fieldset>
            <legend>自定义结构</legend>
            <div className="product-image-set-custom-structure">
              {customStructureOptions.map((option) => {
                const value = customStructure[option.key] || 0;

                return (
                  <div className="product-image-set-custom-row" key={option.key}>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{customStructureDescriptions[option.key]}</small>
                    </span>
                    <div>
                      <button type="button" aria-label={`减少${option.label}`} disabled={value <= 0} onClick={() => updateCustomStructure(option.key, -1)}>
                        -
                      </button>
                      <strong>{value}</strong>
                      <button type="button" aria-label={`增加${option.label}`} disabled={value >= 12} onClick={() => updateCustomStructure(option.key, 1)}>
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={`product-image-set-custom-total ${isCustomStructureValid ? "" : "is-warning"}`.trim()}>
              当前配置：{customStructureTotal} 张。预计消耗：{customStructureTotal} 张图片额度。
              {customStructureWarning ? ` ${customStructureWarning}` : null}
            </p>
          </fieldset>
        )}
      </div>

      <div className="product-image-set-plan-entry">
        <ProductGenerationCostHint compact type="image-set" estimatedCost={0} label="规划不会消耗图片额度" description="" />
        <button className="button primary" disabled={isPlanning || generatingImageIndex !== null || isGeneratingSet || !isCustomStructureValid} type="button" onClick={() => void handleGeneratePlan()}>
          {isPlanning ? (
            <>
              <AiThinkingLoading size="sm" />
              正在规划商品套图...
            </>
          ) : plan ? (
            "重新生成套图规划"
          ) : (
            "生成套图规划"
          )}
        </button>
        <p className="product-image-set-plan-note">先规划每张图的任务，不会立即生成图片。</p>
      </div>

      {error ? <p className="image-generation-error">{error}</p> : null}

      {plan ? (
        <>
          <ProductRiskScanAlert riskScan={riskScan} onOpenRiskConfirmations={onOpenRiskConfirmations} />
          {imageSetCostEstimate ? (
            <div className={`product-image-set-summary-bar product-image-set-batch-toolbar ${batchStatusTone}`.trim()}>
              <div className="product-image-set-summary-copy">
                <p>商品套图 · {plan.images.length} 张</p>
                <div className="product-image-set-summary-metrics">
                  <span>用途：{getPurposeLabel(plan.purpose)}</span>
                  <span>模式：{plannedStructureMode === "custom" ? "自定义配置" : "智能匹配"}</span>
                  {plannedStructureMode === "custom" && plannedCustomStructure ? <span>{formatCustomStructure(plannedCustomStructure)}</span> : null}
                  {plannedOutputSettings ? <span>发布目标：{formatProductOutputSettingsSummary(plannedOutputSettings)}</span> : null}
                  <span>
                    已生成：{generatedCount} / {plan.images.length}
                  </span>
                  {failedCount ? <span>失败：{failedCount}</span> : null}
                  {isGeneratingSet ? <span>已成功：{generatedCount}</span> : null}
                  {pendingCount && !isFullSetGenerated ? <span>待生成：{pendingCount}</span> : null}
                  <span>预计剩余消耗：{imageSetCostEstimate.imageCount} 张图片额度</span>
                </div>
                <ProductGenerationCostHint
                  compact
                  type="image-set"
                  estimatedCost={imageSetCostEstimate.imageCount}
                  imageCount={imageSetCostEstimate.imageCount}
                  label={
                    imageSetCostEstimate.imageCount
                      ? `预计还需消耗 ${imageSetCostEstimate.imageCount} 张图片额度`
                      : "当前没有待生成图片"
                  }
                  description={imageSetCostEstimate.imageCount ? "已生成图片不会重复生成。" : "整套图片已生成完成。"}
                />
                <strong>{getSummaryMessage()}</strong>
                {retryFailedCostEstimate ? <span>重试失败项预计消耗 {retryFailedCostEstimate.imageCount} 张图片额度。</span> : null}
              </div>
              <div className="product-image-set-summary-actions">
                {failedCount ? (
                  <button className="button secondary" disabled={isGeneratingSet || isPlanning} type="button" onClick={() => void handleRetryFailedImages()}>
                    重试失败项
                  </button>
                ) : null}
                {isFullSetGenerated && onViewAssets ? (
                  <button className="button secondary" disabled={isGeneratingSet || isPlanning} type="button" onClick={onViewAssets}>
                    查看素材库
                  </button>
                ) : null}
                <button className="button primary" disabled={isGeneratingSet || isPlanning || isFullSetGenerated} type="button" onClick={() => void handleGenerateFullSet()}>
                  {getFullSetButtonLabel()}
                </button>
              </div>
            </div>
          ) : null}
          <ImageSetStructureValidationNotice structureValidation={structureValidation} />
          {batchProgress.total ? (
            <div className={`product-image-set-batch-status ${batchProgress.failed ? "warning" : batchProgress.completed === batchProgress.total ? "complete" : ""}`.trim()} aria-live="polite">
              <strong>
                已完成 {batchProgress.completed} / {batchProgress.total} 张
              </strong>
              <p>
                {batchProgress.completed === batchProgress.total
                  ? batchProgress.failed
                    ? `${batchProgress.failed} 张生成失败，可稍后单独重新生成。`
                    : "商品套图已生成完成，可在素材中查看和下载。"
                  : "正在按规划顺序逐张生成，已生成图片会立即显示。"}
              </p>
            </div>
          ) : null}
          <ProductImageSetPlanPreview
            generatingImageIndex={generatingImageIndex}
            imageErrors={imageErrors}
            imageResults={imageResults}
            isGenerationDisabled={isGeneratingSet}
            plan={plan}
            onGenerateImage={(image) => void handleGenerateImage(image)}
          />
          <p className="product-image-set-note">整套生成会按顺序逐张使用现有图片生成能力；失败项可稍后单独重新生成。</p>
        </>
      ) : (
        <div className="product-image-set-placeholder">
          <strong>套图规划会显示在这里</strong>
          <p>选择用途和数量后，CloudAI 会给出每张图的目标、文案、画面建议和保真要求。</p>
        </div>
      )}
    </section>
  );
}
