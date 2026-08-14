"use client";

import { ProductDetailPagePlanPreview } from "@/components/products/product-detail-page-plan-preview";
import { AiThinkingLoading } from "@/components/ui/loading";
import type { ProductDetailPagePlan, ProductDetailPageStyle } from "@/lib/ai/product-detail-page-plan-prompt-builder";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useState } from "react";

type ProductDetailPagePanelProps = {
  analysisResult: ProductAnalysisResponse | null;
};

const styleOptions: Array<{ description: string; label: string; value: ProductDetailPageStyle }> = [
  { value: "ecommerce", label: "电商详情页", description: "转化清晰、卖点明确，适合通用电商详情页。" },
  { value: "xiaohongshu", label: "小红书种草", description: "语气自然、有使用感，适合内容种草。" },
  { value: "brand-site", label: "品牌官网", description: "强调品牌感、质感和可信表达。" },
  { value: "minimal", label: "极简高级", description: "文案克制、留白感强，适合高级视觉。" },
];

export function ProductDetailPagePanel({ analysisResult }: ProductDetailPagePanelProps) {
  const [error, setError] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [plan, setPlan] = useState<ProductDetailPagePlan | null>(null);
  const [style, setStyle] = useState<ProductDetailPageStyle>("ecommerce");

  async function handleGeneratePlan() {
    if (!analysisResult?.historyId) {
      setError("请先完成商品分析，再生成详情页规划。");
      return;
    }

    setError("");
    setIsPlanning(true);

    try {
      const response = await fetch("/api/products/detail-page/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: analysisResult.historyId,
          count: 3,
          style,
        }),
      });

      if (!response.ok) {
        throw new Error("生成详情页规划失败，请稍后重试。");
      }

      const data = (await response.json()) as ProductDetailPagePlan;

      setPlan({ pages: Array.isArray(data.pages) ? data.pages : [] });
    } catch {
      setError("生成详情页规划失败，请稍后重试。");
    } finally {
      setIsPlanning(false);
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
        <div className="product-detail-page-fixed-count">
          <span>数量</span>
          <strong>3 张</strong>
          <p>MVP 固定生成 3 张结构规划，暂不开放 5/8 张。</p>
        </div>

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
      </div>

      <button className="button primary" disabled={isPlanning} type="button" onClick={() => void handleGeneratePlan()}>
        {isPlanning ? (
          <>
            <AiThinkingLoading size="sm" />
            正在规划详情页...
          </>
        ) : (
          "生成详情页规划"
        )}
      </button>

      {error ? <p className="image-generation-error">{error}</p> : null}

      {plan ? (
        <>
          <ProductDetailPagePlanPreview pages={plan.pages} />
          <p className="product-detail-plan-note">当前为规划预览，后续将支持根据规划生成详情页图片。</p>
        </>
      ) : (
        <div className="product-detail-plan-placeholder">
          <strong>规划结果会显示在这里</strong>
          <p>生成后将展示首屏卖点、核心内容和购买理由 3 张详情页规划卡片。</p>
        </div>
      )}
    </section>
  );
}
