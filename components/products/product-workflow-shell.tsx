"use client";

import { ProductAnalysisResult } from "@/components/products/product-analysis-result";
import { ProductCreationCenter } from "@/components/products/product-creation-center";
import { ProductCopywritingPanel } from "@/components/products/product-copywriting-panel";
import { ProductImageEditPanel } from "@/components/products/product-image-edit-panel";
import { ProductSceneImagePanel } from "@/components/products/product-scene-image-panel";
import { createGenerationAttempt } from "@/lib/generation-request";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useEffect, useState } from "react";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

const PRODUCT_WORKFLOW_ANALYSIS_STORAGE_KEY = "cloudai:products:last-analysis-history-id";

type WorkflowStepStatus = "done" | "current" | "locked";

function getWorkflowStepStatus(
  step: "upload" | "analysis" | "copywriting" | "imageEdit" | "scene",
  hasAsset: boolean,
  isAnalyzing: boolean,
  hasResult: boolean,
): WorkflowStepStatus {
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

function getStoredAnalysisHistoryId() {
  try {
    return sessionStorage.getItem(PRODUCT_WORKFLOW_ANALYSIS_STORAGE_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

function saveStoredAnalysisHistoryId(analysisHistoryId: string) {
  try {
    sessionStorage.setItem(PRODUCT_WORKFLOW_ANALYSIS_STORAGE_KEY, analysisHistoryId);
  } catch {
    // Ignore storage errors so the workflow still works without persistence.
  }
}

function clearStoredAnalysisHistoryId() {
  try {
    sessionStorage.removeItem(PRODUCT_WORKFLOW_ANALYSIS_STORAGE_KEY);
  } catch {
    // Ignore storage errors so a new product analysis can still continue.
  }
}

export function ProductWorkflowShell() {
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAsset, setUploadedAsset] = useState<UploadedAsset | null>(null);
  const [creationCenterRefreshKey, setCreationCenterRefreshKey] = useState(0);
  const [result, setResult] = useState<ProductAnalysisResponse | null>(null);
  const workflowSteps = [
    { id: "upload" as const, label: "上传商品图" },
    { id: "analysis" as const, label: "AI分析" },
    { id: "copywriting" as const, label: "商品文案" },
    { id: "imageEdit" as const, label: "原图优化" },
    { id: "scene" as const, label: "场景图" },
  ];

  function updateAnalysisUrl(analysisHistoryId?: string) {
    const url = new URL(window.location.href);

    if (analysisHistoryId) {
      url.searchParams.set("analysis", analysisHistoryId);
    } else {
      url.searchParams.delete("analysis");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  useEffect(() => {
    let isMounted = true;
    const urlAnalysisHistoryId = new URLSearchParams(window.location.search).get("analysis")?.trim() || "";
    const analysisHistoryId = urlAnalysisHistoryId || getStoredAnalysisHistoryId();

    async function restoreProductWorkflow() {
      if (!analysisHistoryId) {
        return;
      }

      setIsRestoring(true);
      setError("");

      try {
        const response = await fetch(`/api/products/creation-center?id=${encodeURIComponent(analysisHistoryId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorData?.error || "Product workflow restore failed. Please analyze the product image again.");
        }

        const data = (await response.json()) as ProductCreationCenterData;
        const assetId = data.originalAsset?.id || data.product.assetId || "";

        if (!assetId) {
          throw new Error("The product analysis history is missing its original asset.");
        }

        if (!isMounted) {
          return;
        }

        setUploadedAsset({
          assetId,
          name: data.originalAsset?.name || data.product.title,
          url: data.originalAsset?.url || "",
        });
        setResult({
          assetId,
          historyId: data.product.analysisHistoryId,
          title: data.product.title,
          analysis: data.analysis,
        });
        saveStoredAnalysisHistoryId(data.product.analysisHistoryId);

        if (!urlAnalysisHistoryId) {
          updateAnalysisUrl(data.product.analysisHistoryId);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Product workflow restore failed. Please analyze the product image again.");
          updateAnalysisUrl();
          clearStoredAnalysisHistoryId();
        }
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    }

    void restoreProductWorkflow();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setResult(null);
    updateAnalysisUrl();
    clearStoredAnalysisHistoryId();
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
      const generationAttempt = createGenerationAttempt();
      const response = await generationAttempt.fetch("/api/products/analyze", {
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
      setCreationCenterRefreshKey(0);

      if (data.historyId) {
        updateAnalysisUrl(data.historyId);
        saveStoredAnalysisHistoryId(data.historyId);
      }
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

          <button className="button primary" disabled={!uploadedAsset || isUploading || isAnalyzing || isRestoring} type="button" onClick={() => void handleAnalyze()}>
            {isUploading ? "上传中..." : isAnalyzing ? "分析中..." : "分析商品图片"}
          </button>

          <p className="image-generation-helper">分析会使用商品分析额度，并保存到历史记录。</p>
          {error ? <p className="image-generation-error">{error}</p> : null}
        </div>

        <div className="product-workflow-results">
          <ProductAnalysisResult analysis={result?.analysis || null} title={result?.title} />
          <ProductCreationCenter analysisHistoryId={result?.historyId} refreshKey={creationCenterRefreshKey} />
          <ProductCopywritingPanel analysisResult={result} onGenerated={() => setCreationCenterRefreshKey((value) => value + 1)} />
          <ProductImageEditPanel analysisResult={result} onGenerated={() => setCreationCenterRefreshKey((value) => value + 1)} />
          <ProductSceneImagePanel analysisResult={result} onGenerated={() => setCreationCenterRefreshKey((value) => value + 1)} />
        </div>
      </section>
    </main>
  );
}
