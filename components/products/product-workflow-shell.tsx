"use client";

import { ProductAnalysisResult } from "@/components/products/product-analysis-result";
import { ProductCopywritingPanel } from "@/components/products/product-copywriting-panel";
import { ProductImageEditPanel } from "@/components/products/product-image-edit-panel";
import { ProductSceneImagePanel } from "@/components/products/product-scene-image-panel";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useState } from "react";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

type WorkflowStepStatus = "done" | "current" | "locked";

function getWorkflowStepStatus(step: "upload" | "analysis" | "copywriting" | "scene", hasAsset: boolean, isAnalyzing: boolean, hasResult: boolean): WorkflowStepStatus {
  if (step === "upload") {
    return hasAsset ? "done" : "current";
  }

  if (step === "analysis") {
    if (hasResult) {
      return "done";
    }

    return hasAsset || isAnalyzing ? "current" : "locked";
  }

  return hasResult ? "current" : "locked";
}

export function ProductWorkflowShell() {
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAsset, setUploadedAsset] = useState<UploadedAsset | null>(null);
  const [result, setResult] = useState<ProductAnalysisResponse | null>(null);
  const workflowSteps = [
    { id: "upload" as const, label: "上传商品图" },
    { id: "analysis" as const, label: "AI分析" },
    { id: "copywriting" as const, label: "商品文案" },
    { id: "scene" as const, label: "场景图" },
  ];

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

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

  return (
    <main className="dashboard-content">
      <section className="product-workflow-shell">
        <div className="product-workflow-panel glass-card">
          <p className="eyebrow">Product Workflow</p>
          <h2>商品图 AI 分析</h2>
          <p className="image-generation-intro">
            上传商品图片，CloudAI 会识别商品类别、特点、卖点、目标用户和使用场景。分析完成后，右侧会继续引导你生成商品文案。
          </p>

          <div className="product-workflow-steps" aria-label="商品工作流进度">
            {workflowSteps.map((step) => {
              const status = getWorkflowStepStatus(step.id, Boolean(uploadedAsset), isAnalyzing, Boolean(result));

              return (
                <span className={status} key={step.id}>
                  {step.label}
                </span>
              );
            })}
          </div>

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
        </div>

        <div className="product-workflow-results">
          <ProductAnalysisResult analysis={result?.analysis || null} title={result?.title} />
          <ProductCopywritingPanel analysisResult={result} />
          <ProductImageEditPanel analysisResult={result} />
          <ProductSceneImagePanel analysisResult={result} />
        </div>
      </section>
    </main>
  );
}
