"use client";

import { ProductImageSetPlanPreview } from "@/components/products/product-image-set-plan-preview";
import { AiThinkingLoading } from "@/components/ui/loading";
import type { ProductImageSetCount, ProductImageSetPlan, ProductImageSetPurpose } from "@/lib/ai/product-image-set-plan-prompt-builder";
import type { ProductAnalysisResponse, ProductGenerationBrief } from "@/lib/product-types";
import { useState } from "react";

type ProductImageSetPanelProps = {
  analysisResult: ProductAnalysisResponse | null;
  generationBrief?: ProductGenerationBrief | null;
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

export function ProductImageSetPanel({ analysisResult, generationBrief }: ProductImageSetPanelProps) {
  const [count, setCount] = useState<ProductImageSetCount>(7);
  const [error, setError] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [plan, setPlan] = useState<ProductImageSetPlan | null>(null);
  const [purpose, setPurpose] = useState<ProductImageSetPurpose>("detail-page");

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
    } catch {
      setError("生成套图规划失败，请稍后重试。");
    } finally {
      setIsPlanning(false);
    }
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
                <input checked={count === option.value} name="imageSetCount" type="radio" value={option.value} onChange={() => setCount(option.value)} />
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
            正在规划商品套图...
          </>
        ) : (
          "生成套图规划"
        )}
      </button>

      {error ? <p className="image-generation-error">{error}</p> : null}

      {plan ? (
        <>
          <ProductImageSetPlanPreview plan={plan} />
          <p className="product-image-set-note">当前仅为套图结构规划，后续将支持按单张或整套生成图片。</p>
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
