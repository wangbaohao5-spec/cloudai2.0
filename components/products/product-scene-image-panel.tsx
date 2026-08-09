"use client";

import { PRODUCT_VISUAL_SCENES } from "@/lib/product-visual-options";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useState } from "react";

type ProductSceneImagePanelProps = {
  analysisResult: ProductAnalysisResponse | null;
};

type SceneImageResult = {
  imageUrl: string;
  scene: string;
  platform: string;
  style: string;
};

const platformOptions = [
  { value: "taobao", label: "淘宝" },
  { value: "amazon", label: "Amazon" },
  { value: "tiktok", label: "TikTok Shop" },
];

const styleOptions = [
  { value: "minimal", label: "简约" },
  { value: "premium", label: "高级" },
  { value: "科技产品视觉，冷静清晰的商业灯光，突出结构细节、现代感和专业可信度", label: "科技" },
  { value: "lifestyle", label: "生活化" },
];

function getSceneName(sceneId: string) {
  return PRODUCT_VISUAL_SCENES.find((scene) => scene.id === sceneId)?.name || sceneId;
}

function getOptionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label || value;
}

export function ProductSceneImagePanel({ analysisResult }: ProductSceneImagePanelProps) {
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SceneImageResult | null>(null);
  const [selectedScene, setSelectedScene] = useState(PRODUCT_VISUAL_SCENES[0]?.id || "lifestyle");

  async function handleGenerateSceneImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!analysisResult?.historyId) {
      setError("请先完成商品图片分析，再生成营销场景图。");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const scene = String(formData.get("scene") || selectedScene);
    const platform = String(formData.get("platform") || platformOptions[0].value);
    const style = String(formData.get("style") || styleOptions[0].value);

    setError("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/products/scene-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: analysisResult.historyId,
          scene,
          platform,
          style,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "商品营销场景图生成失败，请稍后再试。");
      }

      const data = (await response.json()) as { imageUrl?: string };

      if (!data.imageUrl) {
        throw new Error("图片生成成功，但没有返回可预览的图片地址。");
      }

      setResult({
        imageUrl: data.imageUrl,
        scene,
        platform,
        style,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "商品营销场景图生成失败，请稍后再试。");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!analysisResult) {
    return (
      <section className="product-scene-image-panel glass-card" id="product-scene-image-panel">
        <p className="eyebrow">Visual Workflow</p>
        <h2>AI 商品营销场景图</h2>
        <p className="image-generation-intro">完成商品图片分析后，可以选择营销场景、平台和视觉风格，生成适合投放或上架的场景图。</p>
      </section>
    );
  }

  return (
    <section className="product-scene-image-panel glass-card" id="product-scene-image-panel">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Visual Workflow</p>
          <h2>AI 商品营销场景图</h2>
          <p className="image-generation-intro">基于当前商品分析结果生成营销场景图，不依赖原图复刻。</p>
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

        <div className="product-scene-controls">
          <label>
            平台选择
            <select name="platform" defaultValue="taobao">
              {platformOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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

        <button className="button primary" disabled={!analysisResult.historyId || isGenerating} type="submit">
          {isGenerating ? "生成场景图中..." : "生成商品营销场景图"}
        </button>
        <p className="image-generation-helper">将调用商品场景图接口，并按 image 类型记录 Usage 和 History。</p>
        {error ? <p className="image-generation-error">{error}</p> : null}
      </form>

      {result ? (
        <div className="product-scene-image-result">
          <div className="product-scene-image-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={`${getSceneName(result.scene)}生成结果`} src={result.imageUrl} />
          </div>
          <dl>
            <div>
              <dt>场景</dt>
              <dd>{getSceneName(result.scene)}</dd>
            </div>
            <div>
              <dt>平台</dt>
              <dd>{getOptionLabel(platformOptions, result.platform)}</dd>
            </div>
            <div>
              <dt>风格</dt>
              <dd>{getOptionLabel(styleOptions, result.style)}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
