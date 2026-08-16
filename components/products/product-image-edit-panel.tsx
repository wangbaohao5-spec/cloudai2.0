"use client";

import { ImageEditGoalSelector } from "@/components/image-edit/image-edit-goal-selector";
import { buildImageDownloadFilename, ImageDownloadButton } from "@/components/ui/image-download-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { LongGenerationLoading } from "@/components/ui/loading";
import { WorkspaceToast } from "@/components/ui/workspace-toast";
import { buildProductImageEditPrompt } from "@/lib/ai/product-image-edit-prompt-builder";
import type { ProductImageEditGoalId } from "@/lib/product-image-edit-options";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useState } from "react";

type ProductImageEditPanelProps = {
  analysisResult: ProductAnalysisResponse | null;
  onGenerated?: () => void;
};

type ProductImageEditResult = {
  imageUrl: string;
  assetId: string;
  warnings?: string[];
};

export function ProductImageEditPanel({ analysisResult, onGenerated }: ProductImageEditPanelProps) {
  const defaultGoalId: ProductImageEditGoalId = "main-image";
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const [goalId, setGoalId] = useState<ProductImageEditGoalId>(defaultGoalId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState("");
  const [prompt, setPrompt] = useState(() => buildProductImageEditPrompt({ goalId: defaultGoalId }));
  const [result, setResult] = useState<ProductImageEditResult | null>(null);

  function showFeedback(message: string, tone: "error" | "success" = "success") {
    setFeedback({ message, tone });
    window.setTimeout(() => setFeedback(null), 2200);
  }

  function handleGoalChange(nextGoalId: ProductImageEditGoalId) {
    setGoalId(nextGoalId);
    setPrompt(buildProductImageEditPrompt({ goalId: nextGoalId }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!analysisResult?.assetId) {
      const message = "请先完成商品图片分析，再优化商品原图。";
      setError(message);
      showFeedback(message, "error");
      return;
    }

    const nextPrompt = prompt.trim();

    if (!nextPrompt) {
      const message = "请输入商品图片优化 Prompt。";
      setError(message);
      showFeedback(message, "error");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/image/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId: analysisResult.assetId,
          analysisHistoryId: analysisResult.historyId,
          prompt: nextPrompt,
          model: "gpt-image-2",
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "商品图片优化失败，请稍后再试。");
      }

      const data = (await response.json()) as ProductImageEditResult;

      setResult(data);

      if (!data.warnings?.length) {
        onGenerated?.();
        showFeedback("图片优化完成");
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "商品图片优化失败，请稍后再试。";
      setError(message);
      showFeedback(message, "error");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!analysisResult) {
    return (
      <section className="product-scene-image-panel glass-card" id="product-image-edit-panel">
        <p className="eyebrow">Image Workflow</p>
        <h2>AI 商品原图优化</h2>
        <p className="image-generation-intro">完成商品图片分析后，可以基于上传的原商品图生成主图、详情图、种草图或广告视觉图。</p>
      </section>
    );
  }

  return (
    <section className="product-scene-image-panel glass-card" id="product-image-edit-panel">
      {feedback ? <WorkspaceToast message={feedback.message} tone={feedback.tone} /> : null}
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Image Workflow</p>
          <h2>AI 商品原图优化</h2>
          <p className="image-generation-intro">基于当前上传的原商品图进行 AI 编辑优化，尽量保持商品主体、颜色和结构一致。</p>
        </div>
        <span>已连接原图 Asset</span>
      </div>

      <form className="image-edit-form" onSubmit={(event) => void handleSubmit(event)}>
        <ImageEditGoalSelector value={goalId} onChange={handleGoalChange} />

        <label>
          优化 Prompt
          <textarea
            name="prompt"
            placeholder="系统会根据优化目标生成基础 Prompt，你也可以继续补充具体要求。"
            required
            rows={8}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>

        <button className="button primary" disabled={!analysisResult.assetId || isGenerating} type="submit">
          {isGenerating ? (
            <>
              <LongGenerationLoading size="sm" />
              正在优化图片...
            </>
          ) : (
            "优化商品原图"
          )}
        </button>
        <p className="image-generation-helper">将调用现有图片编辑接口，并继续记录 Usage 和 History。</p>
        {error ? <p className="image-generation-error">{error}</p> : null}
      </form>

      {result ? (
        <div className="product-scene-image-result">
          <div className="product-scene-image-preview">
            <button className="product-image-preview-button" type="button" aria-label="放大查看商品原图优化结果" onClick={() => setLightboxImageUrl(result.imageUrl)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="商品原图优化结果" src={result.imageUrl} />
            </button>
          </div>
          <div className="product-preview-actions">
            <ImageDownloadButton filename={buildImageDownloadFilename("image-edit")} imageUrl={result.imageUrl} />
          </div>
          <dl>
            <div>
              <dt>模型</dt>
              <dd>GPT-image-2</dd>
            </div>
            <div>
              <dt>结果 Asset</dt>
              <dd>{result.assetId}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {lightboxImageUrl ? (
        <ImageLightbox alt="商品原图优化结果" imageUrl={lightboxImageUrl} title="商品原图优化结果" onClose={() => setLightboxImageUrl("")} />
      ) : null}
    </section>
  );
}
