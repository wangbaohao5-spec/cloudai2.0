"use client";

import { ProductWorkspaceRail } from "@/components/products/product-workspace-rail";
import { ProductWorkspaceTabs } from "@/components/products/product-workspace-tabs";
import { WorkspaceToast } from "@/components/ui/workspace-toast";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useEffect, useRef, useState } from "react";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

const PRODUCT_WORKFLOW_ANALYSIS_STORAGE_KEY = "cloudai:products:last-analysis-history-id";

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

async function fetchCreationCenterData(analysisHistoryId: string) {
  const response = await fetch(`/api/products/creation-center?id=${encodeURIComponent(analysisHistoryId)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorData?.error || "Product workspace restore failed. Please analyze the product image again.");
  }

  return (await response.json()) as ProductCreationCenterData;
}

export function ProductWorkspaceShell() {
  const [error, setError] = useState("");
  const [creationCenterError, setCreationCenterError] = useState("");
  const [creationCenterData, setCreationCenterData] = useState<ProductCreationCenterData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreationCenterLoading, setIsCreationCenterLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAsset, setUploadedAsset] = useState<UploadedAsset | null>(null);
  const [creationCenterRefreshKey, setCreationCenterRefreshKey] = useState(0);
  const [productSupplement, setProductSupplement] = useState("");
  const [result, setResult] = useState<ProductAnalysisResponse | null>(null);
  const loadedCreationCenterRef = useRef<{ analysisHistoryId: string; refreshKey: number } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, tone: "error" | "success" = "success") {
    setFeedback({ message, tone });

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 2400);
  }

  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "success" } | null>(null);

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

    async function restoreProductWorkspace() {
      if (!analysisHistoryId) {
        return;
      }

      setIsRestoring(true);
      setError("");
      setCreationCenterError("");

      try {
        const data = await fetchCreationCenterData(analysisHistoryId);
        const assetId = data.originalAsset?.id || data.product.assetId || "";

        if (!assetId) {
          throw new Error("The product analysis history is missing its original asset.");
        }

        if (!isMounted) {
          return;
        }

        setCreationCenterData(data);
        loadedCreationCenterRef.current = {
          analysisHistoryId: data.product.analysisHistoryId,
          refreshKey: 0,
        };
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
          const message = caughtError instanceof Error ? caughtError.message : "Product workspace restore failed. Please analyze the product image again.";
          setError(message);
          setCreationCenterError(message);
          setCreationCenterData(null);
          updateAnalysisUrl();
          clearStoredAnalysisHistoryId();
        }
      } finally {
        if (isMounted) {
          setIsRestoring(false);
        }
      }
    }

    void restoreProductWorkspace();

    return () => {
      isMounted = false;
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const analysisHistoryId = result?.historyId;

    async function loadCreationCenterData() {
      if (!analysisHistoryId) {
        setCreationCenterData(null);
        setCreationCenterError("");
        loadedCreationCenterRef.current = null;
        return;
      }

      if (
        loadedCreationCenterRef.current?.analysisHistoryId === analysisHistoryId &&
        loadedCreationCenterRef.current.refreshKey === creationCenterRefreshKey
      ) {
        return;
      }

      setIsCreationCenterLoading(true);
      setCreationCenterError("");

      try {
        const data = await fetchCreationCenterData(analysisHistoryId);

        if (isMounted) {
          setCreationCenterData(data);
          loadedCreationCenterRef.current = {
            analysisHistoryId,
            refreshKey: creationCenterRefreshKey,
          };
        }
      } catch (caughtError) {
        if (isMounted) {
          setCreationCenterError(caughtError instanceof Error ? caughtError.message : "Product workspace data refresh failed.");
          setCreationCenterData(null);
          loadedCreationCenterRef.current = null;
        }
      } finally {
        if (isMounted) {
          setIsCreationCenterLoading(false);
        }
      }
    }

    void loadCreationCenterData();

    return () => {
      isMounted = false;
    };
  }, [result?.historyId, creationCenterRefreshKey]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setCreationCenterError("");
    setCreationCenterData(null);
    loadedCreationCenterRef.current = null;
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
        throw new Error(errorData?.error || "Product image upload failed. Please try again later.");
      }

      const data = (await response.json()) as UploadedAsset;
      setUploadedAsset(data);
      showToast("商品图片已上传");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Product image upload failed. Please try again later.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAnalyze() {
    if (!uploadedAsset) {
      setError("Please upload a product image first.");
      return;
    }

    setError("");
    setCreationCenterError("");
    setCreationCenterData(null);
    loadedCreationCenterRef.current = null;
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/products/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId: uploadedAsset.assetId,
          productSupplement: productSupplement.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "Product image analysis failed. Please try again later.");
      }

      const data = (await response.json()) as ProductAnalysisResponse;
      setResult(data);
      setCreationCenterRefreshKey(0);

      if (data.historyId) {
        updateAnalysisUrl(data.historyId);
        saveStoredAnalysisHistoryId(data.historyId);
      }
      showToast("商品分析完成，可以继续生成素材");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Product image analysis failed. Please try again later.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleGenerated() {
    setCreationCenterRefreshKey((value) => value + 1);
  }

  return (
    <main className="dashboard-content">
      {feedback ? <WorkspaceToast message={feedback.message} tone={feedback.tone} /> : null}
      <section className="product-workspace-shell">
        <ProductWorkspaceRail
          creationCenterData={creationCenterData}
          error={error}
          isAnalyzing={isAnalyzing}
          isRestoring={isRestoring}
          isUploading={isUploading}
          result={result}
          productSupplement={productSupplement}
          uploadedAsset={uploadedAsset}
          onAnalyze={() => void handleAnalyze()}
          onFileChange={handleFileChange}
          onProductSupplementChange={setProductSupplement}
        />
        <ProductWorkspaceTabs
          creationCenterData={creationCenterData}
          creationCenterError={creationCenterError}
          isCreationCenterLoading={isCreationCenterLoading}
          result={result}
          onGenerated={handleGenerated}
        />
      </section>
    </main>
  );
}
