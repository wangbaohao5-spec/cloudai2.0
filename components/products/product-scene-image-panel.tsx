"use client";

import { buildImageDownloadFilename, ImageDownloadButton } from "@/components/ui/image-download-button";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { LongGenerationLoading } from "@/components/ui/loading";
import { WorkspaceToast } from "@/components/ui/workspace-toast";
import { ProductGenerationCostHint } from "@/components/products/product-generation-cost-hint";
import { createGenerationAttempt } from "@/lib/generation-request";
import { formatProductOutputSettingsSummary, getProductOutputSettingsLabel } from "@/lib/product-output-settings";
import { PRODUCT_VISUAL_SCENES } from "@/lib/product-visual-options";
import type { ProductAnalysisResponse, ProductGenerationBrief, ProductOutputSettings, ProductVisualGenerationMode } from "@/lib/product-types";
import { useState } from "react";

type ProductSceneImagePanelProps = {
  analysisResult: ProductAnalysisResponse | null;
  generationBrief?: ProductGenerationBrief | null;
  outputSettings?: ProductOutputSettings | null;
  onGenerated?: () => void;
};

type SceneImageResult = {
  imageUrl: string;
  scene: string;
  platform: string;
  style: string;
  warnings?: string[];
};

const styleOptions = [
  { value: "minimal", label: "简约" },
  { value: "premium", label: "高级" },
  { value: "科技产品视觉，冷静清晰的商业灯光，突出结构细节、现代感和专业可信度", label: "科技" },
  { value: "lifestyle", label: "生活化" },
];

const generationModeOptions: Array<{ description: string; label: string; value: ProductVisualGenerationMode }> = [
  {
    value: "faithful",
    label: "保真优化",
    description: "尽量保持商品外观、结构、颜色、图案和比例不变，只优化背景、光线和营销表现。",
  },
  {
    value: "creative",
    label: "营销创意",
    description: "允许更强场景、道具和氛围，但商品主体仍会尽量保持一致。",
  },
];

function getSceneName(sceneId: string) {
  return PRODUCT_VISUAL_SCENES.find((scene) => scene.id === sceneId)?.name || sceneId;
}

function getStyleLabel(value: string) {
  return styleOptions.find((option) => option.value === value)?.label || value;
}

export function ProductSceneImagePanel({ analysisResult, generationBrief, outputSettings, onGenerated }: ProductSceneImagePanelProps) {
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const [generationMode, setGenerationMode] = useState<ProductVisualGenerationMode>("faithful");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState("");
  const [result, setResult] = useState<SceneImageResult | null>(null);
  const [selectedScene, setSelectedScene] = useState(PRODUCT_VISUAL_SCENES[0]?.id || "lifestyle");

  function showFeedback(message: string, tone: "error" | "success" = "success") {
    setFeedback({ message, tone });
    window.setTimeout(() => setFeedback(null), 2200);
  }

  async function handleGenerateSceneImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!analysisResult?.historyId) {
      const message = "请先完成商品图片分析，再生成营销场景图。";
      setError(message);
      showFeedback(message, "error");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const scene = String(formData.get("scene") || selectedScene);
    const platform = outputSettings?.targetPlatform;
    const style = String(formData.get("style") || styleOptions[0].value);

    setError("");
    setIsGenerating(true);

    try {
      const generationAttempt = createGenerationAttempt();
      const response = await generationAttempt.fetch("/api/products/scene-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: analysisResult.historyId,
          generationMode,
          generationBrief: generationBrief || undefined,
          scene,
          platform,
          outputSettings: outputSettings || undefined,
          style,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "商品营销场景图生成失败，请稍后再试。");
      }

      const data = (await response.json()) as { imageUrl?: string; warnings?: string[] };

      if (!data.imageUrl) {
        throw new Error("图片生成成功，但没有返回可预览的图片地址。");
      }

      setResult({
        imageUrl: data.imageUrl,
        scene,
        platform: platform || "",
        style,
        warnings: data.warnings,
      });

      if (!data.warnings?.length) {
        onGenerated?.();
        showFeedback("场景图生成完成");
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "商品营销场景图生成失败，请稍后再试。";
      setError(message);
      showFeedback(message, "error");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!analysisResult) {
    return (
      <section className="product-scene-image-panel glass-card" id="product-scene-image-panel">
        <p className="eyebrow">Visual Workflow</p>
        <h2>AI 商品营销场景图</h2>
        <p className="image-generation-intro">完成商品图片分析后，可以选择营销场景和视觉风格，生成适合投放或上架的场景图。</p>
      </section>
    );
  }

  return (
    <section className="product-scene-image-panel glass-card" id="product-scene-image-panel">
      {feedback ? <WorkspaceToast message={feedback.message} tone={feedback.tone} /> : null}
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Visual Workflow</p>
          <h2>AI 商品营销场景图</h2>
          <p className="image-generation-intro">基于当前商品分析结果生成营销场景图，不依赖原图复制。</p>
        </div>
        <span>已连接分析结果</span>
      </div>

      <form className="product-scene-image-form" onSubmit={(event) => void handleGenerateSceneImage(event)}>
        <div className="product-scene-options" role="radiogroup" aria-label="营销场景选择">
          {PRODUCT_VISUAL_SCENES.map((scene) => (
            <label className={selectedScene === scene.id ? "active" : ""} key={scene.id}>
              <input
                checked={selectedScene === scene.id}
                name="scene"
                type="radio"
                value={scene.id}
                onChange={() => setSelectedScene(scene.id)}
              />
              <strong>{scene.name}</strong>
              <span>{scene.description}</span>
            </label>
          ))}
        </div>

        {outputSettings ? (
          <div className="product-inherited-output-target">
            <strong>当前发布目标</strong>
            <span>场景图会参考「{formatProductOutputSettingsSummary(outputSettings)}」生成画面风格、语言和比例。</span>
          </div>
        ) : null}

        <div className="product-scene-controls">
          <label>
            风格选择
            <select name="style" defaultValue="minimal">
              {styleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="product-visual-mode-selector">
          <legend>生成模式</legend>
          <div>
            {generationModeOptions.map((option) => (
              <label className={generationMode === option.value ? "active" : ""} key={option.value}>
                <input
                  checked={generationMode === option.value}
                  name="generationMode"
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

        <ProductGenerationCostHint
          compact
          type="scene-image"
          label="预计消耗 1 张图片额度"
          description="生成前请确认场景、风格和保真模式；实际记录以额度中心为准。"
        />
        <button className="button primary" disabled={!analysisResult.historyId || isGenerating} type="submit">
          {isGenerating ? (
            <>
              <LongGenerationLoading size="sm" />
              正在生成场景图...
            </>
          ) : (
            "生成商品营销场景图"
          )}
        </button>
        <p className="image-generation-helper">将使用商品场景图生成能力，并继续记录到额度中心和历史记录。</p>
        {error ? <p className="image-generation-error">{error}</p> : null}
      </form>

      {result ? (
        <div className="product-scene-image-result">
          <div className="product-scene-image-preview">
            <button
              className="product-image-preview-button"
              type="button"
              aria-label={`放大查看${getSceneName(result.scene)}生成结果`}
              onClick={() => setLightboxImageUrl(result.imageUrl)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`${getSceneName(result.scene)}生成结果`} src={result.imageUrl} />
            </button>
          </div>
          <div className="product-preview-actions">
            <ImageDownloadButton filename={buildImageDownloadFilename("scene-image", [getSceneName(result.scene)])} imageUrl={result.imageUrl} />
          </div>
          <dl>
            <div>
              <dt>场景</dt>
              <dd>{getSceneName(result.scene)}</dd>
            </div>
            <div>
              <dt>发布目标</dt>
              <dd>{outputSettings ? getProductOutputSettingsLabel(outputSettings, "targetPlatform") : result.platform || "通用电商"}</dd>
            </div>
            <div>
              <dt>风格</dt>
              <dd>{getStyleLabel(result.style)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      {lightboxImageUrl ? (
        <ImageLightbox
          alt={result ? `${getSceneName(result.scene)}生成结果` : "商品营销场景图"}
          imageUrl={lightboxImageUrl}
          title={result ? `${getSceneName(result.scene)}生成结果` : "商品营销场景图"}
          onClose={() => setLightboxImageUrl("")}
        />
      ) : null}
    </section>
  );
}
