"use client";

import { ProductImageSetPlanPreview, type ProductImageSetImageResult } from "@/components/products/product-image-set-plan-preview";
import { AiThinkingLoading } from "@/components/ui/loading";
import type { ProductImageSetCount, ProductImageSetPlan, ProductImageSetPlanImage, ProductImageSetPurpose } from "@/lib/ai/product-image-set-plan-prompt-builder";
import { getImageSetCostEstimate } from "@/lib/product-generation-cost";
import type { ProductAnalysisResponse, ProductGenerationBrief } from "@/lib/product-types";
import { useState } from "react";

type ProductImageSetPanelProps = {
  analysisResult: ProductAnalysisResponse | null;
  generationBrief?: ProductGenerationBrief | null;
  onGenerated?: () => void;
};

type BatchProgress = {
  completed: number;
  failed: number;
  total: number;
};

const purposeOptions: Array<{ description: string; label: string; value: ProductImageSetPurpose }> = [
  {
    value: "quick-listing",
    label: "快速上架",
    description: "适合主图、卖点图、场景图、细节图。",
  },
  {
    value: "detail-page",
    label: "详情页套图",
    description: "适合首屏主视觉、核心卖点、使用场景、细节、参数和总结。",
  },
  {
    value: "social-seeding",
    label: "社媒种草",
    description: "适合小红书、抖音、朋友圈等内容场景。",
  },
  {
    value: "platform-listing",
    label: "平台 Listing",
    description: "适合 Amazon / Shopee / TikTok Shop 等跨境或平台商品图。",
  },
];

const countOptions: Array<{ description: string; label: string; value: ProductImageSetCount }> = [
  { value: 3, label: "3 张", description: "快速测试" },
  { value: 5, label: "5 张", description: "基础套图" },
  { value: 7, label: "7 张", description: "常见商品套图" },
  { value: 8, label: "8 张", description: "完整详情页 / Listing 结构" },
];

export function ProductImageSetPanel({ analysisResult, generationBrief, onGenerated }: ProductImageSetPanelProps) {
  const [count, setCount] = useState<ProductImageSetCount>(7);
  const [error, setError] = useState("");
  const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, string>>({});
  const [imageResults, setImageResults] = useState<Record<number, ProductImageSetImageResult>>({});
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({ completed: 0, failed: 0, total: 0 });
  const [isGeneratingSet, setIsGeneratingSet] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [plan, setPlan] = useState<ProductImageSetPlan | null>(null);
  const [purpose, setPurpose] = useState<ProductImageSetPurpose>("detail-page");
  const remainingImages = plan?.images.filter((image) => !imageResults[image.imageIndex]).sort((left, right) => left.imageIndex - right.imageIndex) || [];
  const generatedCount = plan ? plan.images.length - remainingImages.length : 0;
  const imageSetCostEstimate = plan ? getImageSetCostEstimate(remainingImages.length) : null;
  const isFullSetGenerated = Boolean(plan?.images.length) && remainingImages.length === 0;

  function handleCountChange(nextCount: ProductImageSetCount) {
    setCount(nextCount);
    setPlan(null);
    setImageErrors({});
    setImageResults({});
    setBatchProgress({ completed: 0, failed: 0, total: 0 });
  }

  async function handleGeneratePlan() {
    if (!analysisResult?.historyId) {
      setError("请先完成商品分析，再生成套图规划。");
      return;
    }

    setError("");
    setIsPlanning(true);

    try {
      const response = await fetch("/api/products/image-set/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: analysisResult.historyId,
          count,
          generationBrief: generationBrief || undefined,
          purpose,
        }),
      });

      if (!response.ok) {
        throw new Error("生成套图规划失败，请稍后重试。");
      }

      const data = (await response.json()) as ProductImageSetPlan;

      setPlan({
        count: data.count,
        images: Array.isArray(data.images) ? data.images : [],
        purpose: data.purpose,
      });
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
          count,
          generationBrief: generationBrief || undefined,
          generationMode: image.suggestedGenerationMode || "faithful",
          image,
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

      <div className="product-image-set-settings">
        <fieldset>
          <legend>套图用途</legend>
          <div className="product-image-set-purpose-grid">
            {purposeOptions.map((option) => (
              <label className={purpose === option.value ? "active" : ""} key={option.value}>
                <input checked={purpose === option.value} name="imageSetPurpose" type="radio" value={option.value} onChange={() => setPurpose(option.value)} />
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>套图数量</legend>
          <div className="product-image-set-count-grid">
            {countOptions.map((option) => (
              <label className={count === option.value ? "active" : ""} key={option.value}>
                <input checked={count === option.value} name="imageSetCount" type="radio" value={option.value} onChange={() => handleCountChange(option.value)} />
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <button className="button primary" disabled={isPlanning || generatingImageIndex !== null || isGeneratingSet} type="button" onClick={() => void handleGeneratePlan()}>
        {isPlanning ? (
          <>
            <AiThinkingLoading size="sm" />
            正在规划商品套图...
          </>
        ) : (
          "生成套图规划"
        )}
      </button>

      {error ? <p className="image-generation-error">{error}</p> : null}

      {plan ? (
        <>
          {imageSetCostEstimate ? (
            <div className="product-image-set-batch-toolbar">
              <div className="product-image-set-summary-copy">
                <p>商品套图 · {plan.images.length} 张</p>
                <strong>
                  已生成 {generatedCount} / {plan.images.length} 张
                </strong>
                <span>
                  {remainingImages.length
                    ? `本次将生成 ${remainingImages.length} 张，预计消耗 ${imageSetCostEstimate.imageCount} 张图片额度。已生成的图片不会重复生成。`
                    : "整套图片已经生成完成，可在素材中查看和下载。"}
                </span>
              </div>
              <button className="button primary" disabled={isGeneratingSet || isPlanning || isFullSetGenerated} type="button" onClick={() => void handleGenerateFullSet()}>
                {isGeneratingSet
                  ? `正在生成 ${Math.min(batchProgress.completed + 1, batchProgress.total)} / ${batchProgress.total}...`
                  : isFullSetGenerated
                    ? "整套已生成"
                    : "生成整套"}
              </button>
            </div>
          ) : null}
          {batchProgress.total ? (
            <div className={`product-image-set-batch-status ${batchProgress.completed === batchProgress.total ? "complete" : ""}`.trim()} aria-live="polite">
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
          <p className="product-image-set-note">整套生成会按顺序逐张调用现有图片生成接口；失败项可稍后单独重新生成。</p>
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
