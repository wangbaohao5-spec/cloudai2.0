"use client";

import { CopywritingResult as CopywritingResultView } from "@/components/copywriting/copywriting-result";
import { ProductAnalysisResult } from "@/components/products/product-analysis-result";
import { platformOptions, productGoalOptions, toneOptions } from "@/lib/copywriting-options";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import type { CopywritingResult } from "@/lib/types";
import { useState } from "react";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

function buildCopywritingText(result: CopywritingResult) {
  return [
    `商品标题：\n${result.title}`,
    `核心卖点：\n${result.points.map((point) => `- ${point}`).join("\n")}`,
    `详情描述：\n${result.description}`,
    `短视频口播：\n${result.shortVideoScript}`,
  ].join("\n\n");
}

export function ProductWorkflowShell() {
  const [copywritingError, setCopywritingError] = useState("");
  const [copywritingResult, setCopywritingResult] = useState<CopywritingResult | null>(null);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCopywritingLoading, setIsCopywritingLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAsset, setUploadedAsset] = useState<UploadedAsset | null>(null);
  const [result, setResult] = useState<ProductAnalysisResponse | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setCopywritingError("");
    setCopywritingResult(null);
    setError("");
    setResult(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "upload");

      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "商品图片上传失败，请稍后再试。");
      }

      const data = (await response.json()) as UploadedAsset;
      setUploadedAsset(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "商品图片上传失败，请稍后再试。");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAnalyze() {
    if (!uploadedAsset) {
      setError("请先上传商品图片。");
      return;
    }

    setCopywritingError("");
    setCopywritingResult(null);
    setError("");
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/products/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId: uploadedAsset.assetId,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "商品图片分析失败，请稍后再试。");
      }

      const data = (await response.json()) as ProductAnalysisResponse;
      setResult(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "商品图片分析失败，请稍后再试。");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleGenerateCopywriting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!result?.historyId) {
      setCopywritingError("当前分析结果尚未保存，暂时无法基于分析生成文案。");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setCopywritingError("");
    setIsCopywritingLoading(true);

    try {
      const response = await fetch("/api/products/copywriting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: result.historyId,
          platform: String(formData.get("platform") || ""),
          tone: String(formData.get("tone") || ""),
          goal: String(formData.get("goal") || ""),
          generationMode: "marketing-plan",
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "基于商品分析生成文案失败，请稍后再试。");
      }

      const data = (await response.json()) as CopywritingResult;
      setCopywritingResult(data);
    } catch (caughtError) {
      setCopywritingError(caughtError instanceof Error ? caughtError.message : "基于商品分析生成文案失败，请稍后再试。");
    } finally {
      setIsCopywritingLoading(false);
    }
  }

  async function handleCopyCopywriting() {
    if (!copywritingResult) {
      return;
    }

    await navigator.clipboard.writeText(buildCopywritingText(copywritingResult));
  }

  return (
    <main className="dashboard-content">
      <section className="product-workflow-shell">
        <div className="product-workflow-panel glass-card">
          <p className="eyebrow">Product Workflow</p>
          <h2>商品图 AI 分析</h2>
          <p className="image-generation-intro">
            上传商品图片，CloudAI 会识别商品类别、特点、卖点、目标用户和使用场景。分析完成后，可继续基于分析结果生成商品文案。
          </p>

          <div className="product-upload-box">
            <label>
              商品图片
              <input accept="image/png,image/jpeg,image/webp" type="file" onChange={handleFileChange} />
            </label>
            <div className="product-upload-preview">
              {uploadedAsset?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={uploadedAsset.name || "商品图片预览"} src={uploadedAsset.url} />
              ) : (
                <p>选择图片后会自动上传为 CloudAI Asset。</p>
              )}
            </div>
            {uploadedAsset ? <span>{uploadedAsset.name}</span> : null}
          </div>

          <button className="button primary" disabled={!uploadedAsset || isUploading || isAnalyzing} type="button" onClick={() => void handleAnalyze()}>
            {isUploading ? "上传中..." : isAnalyzing ? "分析中..." : "分析商品图片"}
          </button>

          <p className="image-generation-helper">分析会消耗 product-analysis 用量，并保存到历史记录。</p>
          {error ? <p className="image-generation-error">{error}</p> : null}

          {result ? (
            <form className="product-copywriting-form" onSubmit={(event) => void handleGenerateCopywriting(event)}>
              <div>
                <p className="eyebrow">Next Step</p>
                <h3>基于分析生成商品文案</h3>
              </div>
              <label>
                平台
                <select name="platform" defaultValue="taobao">
                  {platformOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                文案风格
                <select name="tone" defaultValue="professional">
                  {toneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                生成目标
                <select name="goal" defaultValue="conversion">
                  {productGoalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button primary" disabled={!result.historyId || isCopywritingLoading} type="submit">
                {isCopywritingLoading ? "生成文案中..." : "基于分析生成商品文案"}
              </button>
              <p className="image-generation-helper">将复用现有 AI 文案能力，并保存为文案历史记录。</p>
              {copywritingError ? <p className="image-generation-error">{copywritingError}</p> : null}
            </form>
          ) : null}
        </div>

        <div className="product-workflow-results">
          <ProductAnalysisResult analysis={result?.analysis || null} title={result?.title} />
          {copywritingResult ? (
            <div className="product-copywriting-result">
              <CopywritingResultView result={copywritingResult} />
              <button className="button secondary" type="button" onClick={() => void handleCopyCopywriting()}>
                复制文案结果
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
