"use client";

import { ProductWorkspaceRail } from "@/components/products/product-workspace-rail";
import { ProductWorkspaceTabs } from "@/components/products/product-workspace-tabs";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useEffect, useState } from "react";

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
  const [result, setResult] = useState<ProductAnalysisResponse | null>(null);

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
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const analysisHistoryId = result?.historyId;

    async function loadCreationCenterData() {
      if (!analysisHistoryId) {
        setCreationCenterData(null);
        setCreationCenterError("");
        return;
      }

      setIsCreationCenterLoading(true);
      setCreationCenterError("");

      try {
        const data = await fetchCreationCenterData(analysisHistoryId);

        if (isMounted) {
          setCreationCenterData(data);
        }
      } catch (caughtError) {
        if (isMounted) {
          setCreationCenterError(caughtError instanceof Error ? caughtError.message : "Product workspace data refresh failed.");
          setCreationCenterData(null);
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
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Product image upload failed. Please try again later.");
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
        throw new Error(errorData?.error || "Product image analysis failed. Please try again later.");
      }

      const data = (await response.json()) as ProductAnalysisResponse;
      setResult(data);
      setCreationCenterRefreshKey(0);

      if (data.historyId) {
        updateAnalysisUrl(data.historyId);
        saveStoredAnalysisHistoryId(data.historyId);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Product image analysis failed. Please try again later.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleGenerated() {
    setCreationCenterRefreshKey((value) => value + 1);
  }

  return (
    <main className="dashboard-content">
      <section className="product-workspace-shell">
        <ProductWorkspaceRail
          creationCenterData={creationCenterData}
          error={error}
          isAnalyzing={isAnalyzing}
          isRestoring={isRestoring}
          isUploading={isUploading}
          result={result}
          uploadedAsset={uploadedAsset}
          onAnalyze={() => void handleAnalyze()}
          onFileChange={handleFileChange}
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
