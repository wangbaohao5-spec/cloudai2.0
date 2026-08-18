"use client";

import { ProductDetailPagePlanPreview, type DetailPageImageResult } from "@/components/products/product-detail-page-plan-preview";
import { ProductGenerationCostHint } from "@/components/products/product-generation-cost-hint";
import { ProductRiskScanAlert } from "@/components/products/product-risk-scan-alert";
import { AiThinkingLoading } from "@/components/ui/loading";
import type {
  ProductDetailPageCount,
  ProductDetailPagePlan,
  ProductDetailPagePlanPage,
  ProductDetailPageStyle,
} from "@/lib/ai/product-detail-page-plan-prompt-builder";
import type { ProductAnalysisResponse, ProductGenerationBrief, ProductVisualGenerationMode } from "@/lib/product-types";
import { useState } from "react";

type ProductDetailPagePanelProps = {
  analysisResult: ProductAnalysisResponse | null;
  generationBrief?: ProductGenerationBrief | null;
  onGenerated?: () => void;
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

type ProductDetailPagePlanResponse = ProductDetailPagePlan & {
  riskScan?: ProductRiskScan;
};

const styleOptions: Array<{ description: string; label: string; value: ProductDetailPageStyle }> = [
  { value: "ecommerce", label: "电商详情页", description: "转化清晰、卖点明确，适合通用电商详情页。" },
  { value: "xiaohongshu", label: "小红书种草", description: "语气自然、有使用感，适合内容种草。" },
  { value: "brand-site", label: "品牌官网", description: "强调品牌感、质感和可信表达。" },
  { value: "minimal", label: "极简高级", description: "文案克制、留白感强，适合高级视觉。" },
];

const countOptions: Array<{ description: string; label: string; value: ProductDetailPageCount }> = [
  { value: 3, label: "3 张", description: "适合快速生成首图、卖点图、CTA。" },
  { value: 5, label: "5 张", description: "适合补充场景图和细节图。" },
  { value: 8, label: "8 张", description: "适合完整商品详情页结构。" },
];

const generationModeOptions: Array<{ description: string; label: string; value: ProductVisualGenerationMode }> = [
  {
    value: "faithful",
    label: "保真优化",
    description: "更适合键盘、衣服、鞋、包、手机壳等带固定外观和图案的商品。",
  },
  {
    value: "creative",
    label: "营销创意",
    description: "允许更强详情页氛围和视觉包装，但仍尽量保持商品主体一致。",
  },
];

export function ProductDetailPagePanel({ analysisResult, generationBrief, onGenerated }: ProductDetailPagePanelProps) {
  const [count, setCount] = useState<ProductDetailPageCount>(3);
  const [error, setError] = useState("");
  const [generationMode, setGenerationMode] = useState<ProductVisualGenerationMode>("faithful");
  const [generatingPageIndex, setGeneratingPageIndex] = useState<number | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [pageErrors, setPageErrors] = useState<Record<number, string>>({});
  const [pageResults, setPageResults] = useState<Record<number, DetailPageImageResult>>({});
  const [plan, setPlan] = useState<ProductDetailPagePlan | null>(null);
  const [riskScan, setRiskScan] = useState<ProductRiskScan | null>(null);
  const [style, setStyle] = useState<ProductDetailPageStyle>("ecommerce");

  function handleCountChange(nextCount: ProductDetailPageCount) {
    setCount(nextCount);
    setPlan(null);
    setRiskScan(null);
    setPageErrors({});
    setPageResults({});
  }

  async function handleGeneratePlan() {
    if (!analysisResult?.historyId) {
      setError("请先完成商品分析，再生成详情页规划。");
      return;
    }

    setError("");
    setRiskScan(null);
    setIsPlanning(true);

    try {
      const response = await fetch("/api/products/detail-page/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: analysisResult.historyId,
          count,
          generationBrief: generationBrief || undefined,
          style,
        }),
      });

      if (!response.ok) {
        throw new Error("生成详情页规划失败，请稍后重试。");
      }

      const data = (await response.json()) as ProductDetailPagePlanResponse;

      setPlan({ pages: Array.isArray(data.pages) ? data.pages : [] });
      setRiskScan(data.riskScan || null);
      setPageErrors({});
      setPageResults({});
    } catch {
      setError("生成详情页规划失败，请稍后重试。");
    } finally {
      setIsPlanning(false);
    }
  }

  async function handleGeneratePage(page: ProductDetailPagePlanPage) {
    if (!analysisResult?.historyId) {
      setPageErrors((current) => ({
        ...current,
        [page.pageIndex]: "请先完成商品分析，再生成详情页图片。",
      }));
      return;
    }

    const isRegeneration = Boolean(pageResults[page.pageIndex]);

    setGeneratingPageIndex(page.pageIndex);
    setPageErrors((current) => {
      const next = { ...current };
      delete next[page.pageIndex];
      return next;
    });

    try {
      const response = await fetch("/api/products/detail-page/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: analysisResult.historyId,
          generationMode,
          generationBrief: generationBrief || undefined,
          page,
          style,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        const isUnavailable = errorData?.error?.toLowerCase().includes("unavailable") || response.status === 503;

        throw new Error(isUnavailable ? "图片生成模型当前繁忙，请稍后重试。" : "生成详情页图片失败，请稍后重试。");
      }

      const data = (await response.json()) as DetailPageImageResult;

      setPageResults((current) => ({
        ...current,
        [page.pageIndex]: data,
      }));
      onGenerated?.();
    } catch (caughtError) {
      const fallbackMessage = isRegeneration ? "重新生成失败，请稍后重试。" : "生成详情页图片失败，请稍后重试。";

      setPageErrors((current) => ({
        ...current,
        [page.pageIndex]: caughtError instanceof Error && !isRegeneration ? caughtError.message : fallbackMessage,
      }));
    } finally {
      setGeneratingPageIndex(null);
    }
  }

  if (!analysisResult) {
    return (
      <section className="product-detail-page-panel glass-card">
        <p className="eyebrow">Detail Page</p>
        <h2>商品详情页规划</h2>
        <p className="image-generation-intro">完成商品分析后，可以先规划详情页结构，再用于后续生成图文素材。</p>
      </section>
    );
  }

  return (
    <section className="product-detail-page-panel glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Detail Page</p>
          <h2>商品详情页规划</h2>
          <p className="image-generation-intro">基于当前商品分析和已生成文案，先规划详情页结构，再用于后续生成图文素材。</p>
        </div>
        <span>规划预览</span>
      </div>

      <div className="product-detail-page-settings">
        <fieldset>
          <legend>详情页数量</legend>
          <div className="product-detail-count-grid">
            {countOptions.map((option) => (
              <label className={count === option.value ? "active" : ""} key={option.value}>
                <input checked={count === option.value} name="detailPageCount" type="radio" value={option.value} onChange={() => handleCountChange(option.value)} />
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>风格</legend>
          <div className="product-detail-style-grid">
            {styleOptions.map((option) => (
              <label className={style === option.value ? "active" : ""} key={option.value}>
                <input checked={style === option.value} name="detailPageStyle" type="radio" value={option.value} onChange={() => setStyle(option.value)} />
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="product-visual-mode-selector">
          <legend>生成模式</legend>
          <div>
            {generationModeOptions.map((option) => (
              <label className={generationMode === option.value ? "active" : ""} key={option.value}>
                <input
                  checked={generationMode === option.value}
                  name="detailPageGenerationMode"
                  type="radio"
                  value={option.value}
                  onChange={() => setGenerationMode(option.value)}
                />
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="product-generation-action-stack">
        <ProductGenerationCostHint compact type="detail-page" estimatedCost={0} label="规划不会消耗图片额度" />
        <button className="button primary" disabled={isPlanning || generatingPageIndex !== null} type="button" onClick={() => void handleGeneratePlan()}>
          {isPlanning ? (
            <>
              <AiThinkingLoading size="sm" />
              正在规划详情页...
            </>
          ) : (
            "生成详情页规划"
          )}
        </button>
      </div>

      {error ? <p className="image-generation-error">{error}</p> : null}

      {plan ? (
        <>
          <ProductRiskScanAlert riskScan={riskScan} />
          <ProductDetailPagePlanPreview
            generatingPageIndex={generatingPageIndex}
            pageErrors={pageErrors}
            pageResults={pageResults}
            pages={plan.pages}
            onGeneratePage={(page) => void handleGeneratePage(page)}
          />
          <p className="product-detail-plan-note">当前为规划预览，已支持单张生成详情页图片；AI 生成图中文字可能需要人工检查。</p>
        </>
      ) : (
        <div className="product-detail-plan-placeholder">
          <strong>规划结果会显示在这里</strong>
          <p>生成后将展示 {count} 张详情页规划卡片，可选择其中任意一张单独生成图片。</p>
        </div>
      )}
    </section>
  );
}
