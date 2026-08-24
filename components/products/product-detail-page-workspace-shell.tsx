"use client";

import { ProductDetailPagePanel } from "@/components/products/product-detail-page-panel";
import { ProductWorkspaceEmptyState } from "@/components/products/product-workspace-empty-state";
import { WorkspaceToast } from "@/components/ui/workspace-toast";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import { DEFAULT_FORBIDDEN_PRODUCT_CLAIMS, getProductGenerationBriefFromSession } from "@/lib/product-generation-brief";
import {
  DEFAULT_PRODUCT_OUTPUT_SETTINGS,
  formatProductOutputSettingsSummary,
  getProductOutputSettingsFromSession,
  sanitizeProductOutputSettings,
} from "@/lib/product-output-settings";
import type { HistoryRecord } from "@/lib/types";
import type { ProductAnalysisResponse, ProductGenerationBrief, ProductImageAnalysis, ProductOutputSettings } from "@/lib/product-types";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const WORKSPACE_PRODUCTS_PATH = "/dashboard/products";
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
    // Ignore storage errors so the detail page can still load from the URL.
  }
}

function clearStoredAnalysisHistoryId(analysisHistoryId: string) {
  try {
    if (sessionStorage.getItem(PRODUCT_WORKFLOW_ANALYSIS_STORAGE_KEY)?.trim() === analysisHistoryId) {
      sessionStorage.removeItem(PRODUCT_WORKFLOW_ANALYSIS_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors so the user still sees the friendly error state.
  }
}

function getObjectField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function getLatestOutputSettingsFromHistory(records: HistoryRecord[]) {
  const sortedRecords = [...records].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  for (const record of sortedRecords) {
    const inputSettings = sanitizeProductOutputSettings(getObjectField(record.input, "outputSettings"));
    const outputSettings = sanitizeProductOutputSettings(getObjectField(record.output, "outputSettings"));

    if (inputSettings) {
      return inputSettings;
    }

    if (outputSettings) {
      return outputSettings;
    }
  }

  return null;
}

function compactItems(...groups: unknown[]) {
  return groups
    .flatMap((group) => {
      if (!group) {
        return [];
      }

      return Array.isArray(group) ? group : [group];
    })
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items));
}

function buildFallbackBriefFromAnalysis(analysis: ProductImageAnalysis): ProductGenerationBrief {
  return {
    avoidChanges: uniqueItems(compactItems(analysis.avoidChanges)),
    coreSellingPoints: uniqueItems(compactItems(analysis.sellingPoints)),
    extraRequirements: "",
    mustKeepDetails: uniqueItems(compactItems(analysis.mustKeepDetails)),
    productName: analysis.productNameSuggestions[0] || "",
    riskConfirmations: {
      confirmedBrandClaims: "",
      forbiddenClaims: DEFAULT_FORBIDDEN_PRODUCT_CLAIMS,
      complianceNotes: "",
    },
    styleRequirements: compactItems(analysis.detailPageHints?.visualMood, analysis.visualStyle)[0] || "",
    targetAudience: analysis.targetAudience || "",
    usageScenarios: uniqueItems(compactItems(analysis.detailPageHints?.usageScenes, analysis.scenes)),
  };
}

async function fetchCreationCenterData(analysisHistoryId: string) {
  const response = await fetch(`/api/products/creation-center?id=${encodeURIComponent(analysisHistoryId)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("未找到商品分析记录");
  }

  return (await response.json()) as ProductCreationCenterData;
}

function getAnalysisHistoryIdFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get("analysis")?.trim() || "";
  } catch {
    return "";
  }
}

function replaceDetailPageAnalysisUrl(analysisHistoryId: string) {
  const url = new URL(window.location.href);

  url.searchParams.set("analysis", analysisHistoryId);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function goToProductWorkspace(analysisHistoryId?: string) {
  const href = analysisHistoryId ? `${WORKSPACE_PRODUCTS_PATH}?analysis=${encodeURIComponent(analysisHistoryId)}` : WORKSPACE_PRODUCTS_PATH;

  window.location.assign(href);
}

function getProductWorkspaceHref(analysisHistoryId?: string, tab?: "assets" | "export") {
  if (!analysisHistoryId) {
    return WORKSPACE_PRODUCTS_PATH;
  }

  const params = new URLSearchParams({ analysis: analysisHistoryId });

  if (tab) {
    params.set("tab", tab);
  }

  return `${WORKSPACE_PRODUCTS_PATH}?${params.toString()}`;
}

export function ProductDetailPageWorkspaceShell() {
  const [analysisHistoryId, setAnalysisHistoryId] = useState<string | null>(null);
  const [creationCenterData, setCreationCenterData] = useState<ProductCreationCenterData | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const [generationBrief, setGenerationBrief] = useState<ProductGenerationBrief | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [outputSettings, setOutputSettings] = useState<ProductOutputSettings>(DEFAULT_PRODUCT_OUTPUT_SETTINGS);
  const [refreshKey, setRefreshKey] = useState(0);
  const restoredFromSessionRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const urlAnalysisHistoryId = getAnalysisHistoryIdFromUrl();

    if (urlAnalysisHistoryId) {
      restoredFromSessionRef.current = false;
      setAnalysisHistoryId(urlAnalysisHistoryId);
    } else {
      const storedAnalysisHistoryId = getStoredAnalysisHistoryId();

      restoredFromSessionRef.current = Boolean(storedAnalysisHistoryId);

      if (storedAnalysisHistoryId) {
        replaceDetailPageAnalysisUrl(storedAnalysisHistoryId);
      }

      setAnalysisHistoryId(storedAnalysisHistoryId);
    }

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDetailPageContext() {
      if (analysisHistoryId === null || !analysisHistoryId) {
        setCreationCenterData(null);
        setError("");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const data = await fetchCreationCenterData(analysisHistoryId);
        const sessionBrief = getProductGenerationBriefFromSession(analysisHistoryId);
        const sessionOutputSettings = getProductOutputSettingsFromSession(analysisHistoryId);
        const historyOutputSettings = getLatestOutputSettingsFromHistory([
          ...data.copywriting,
          ...data.imageSetImages,
          ...data.detailPages,
          ...data.sceneImages,
          ...data.imageEdits,
        ]);

        if (!isMounted) {
          return;
        }

        setCreationCenterData(data);
        setGenerationBrief(sessionBrief || buildFallbackBriefFromAnalysis(data.analysis));
        setOutputSettings(sessionOutputSettings || historyOutputSettings || DEFAULT_PRODUCT_OUTPUT_SETTINGS);
        saveStoredAnalysisHistoryId(data.product.analysisHistoryId);
      } catch (caughtError) {
        if (process.env.NODE_ENV === "development") {
          console.info("[product-detail-page-workspace] load failed", {
            analysisHistoryId,
            message: caughtError instanceof Error ? caughtError.message : "unknown error",
          });
        }

        if (isMounted) {
          setCreationCenterData(null);
          setError("未找到商品分析记录");

          if (restoredFromSessionRef.current && analysisHistoryId) {
            clearStoredAnalysisHistoryId(analysisHistoryId);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDetailPageContext();

    return () => {
      isMounted = false;
    };
  }, [analysisHistoryId, refreshKey]);

  const productAnalysisResponse = useMemo<ProductAnalysisResponse | null>(() => {
    if (!creationCenterData || !analysisHistoryId) {
      return null;
    }

    return {
      assetId: creationCenterData.product.assetId || creationCenterData.originalAsset?.id || "",
      historyId: analysisHistoryId,
      title: creationCenterData.product.title,
      analysis: creationCenterData.analysis,
    };
  }, [analysisHistoryId, creationCenterData]);

  function showFeedback(message: string, tone: "error" | "success" = "success") {
    setFeedback({ message, tone });

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 2400);
  }

  function handleGenerated() {
    setRefreshKey((value) => value + 1);
    showFeedback("详情页素材已生成，数量已刷新");
  }

  function openRiskConfirmations() {
    if (analysisHistoryId) {
      window.location.assign(`${WORKSPACE_PRODUCTS_PATH}?analysis=${encodeURIComponent(analysisHistoryId)}#product-risk-confirmations`);
    }
  }

  if (analysisHistoryId === null || isLoading) {
    return (
      <main className="dashboard-content">
        <section className="product-detail-page-workspace">
          <ProductWorkspaceEmptyState eyebrow="正在加载" marker="..." title="正在加载详情页制作上下文" description="CloudAI 正在读取当前商品分析记录，请稍等片刻。" />
        </section>
      </main>
    );
  }

  if (!analysisHistoryId) {
    return (
      <main className="dashboard-content">
        <section className="product-detail-page-workspace">
          <ProductWorkspaceEmptyState
            eyebrow="详情页制作"
            marker="DTP"
            title="请选择一个商品后制作详情页"
            description="选择一个已有商品，基于商品策划、发布目标和已有素材制作详情页内容。"
            actions={[{ label: "前往商品工作台", onClick: () => goToProductWorkspace(), tone: "primary" }]}
          />
        </section>
      </main>
    );
  }

  if (error || !creationCenterData || !productAnalysisResponse) {
    return (
      <main className="dashboard-content">
        <section className="product-detail-page-workspace">
          <ProductWorkspaceEmptyState
            eyebrow="记录不可用"
            marker="!"
            title="未找到商品分析记录"
            description="请回到商品工作台重新选择商品，或新建商品并完成分析。"
            actions={[{ label: "返回商品工作台", onClick: () => goToProductWorkspace(), tone: "primary" }]}
          />
        </section>
      </main>
    );
  }

  const productName = creationCenterData.analysis.productNameSuggestions[0] || creationCenterData.product.title;
  const originalAssetUrl = creationCenterData.originalAsset?.previewUrl || creationCenterData.originalAsset?.url || "";
  const workspaceHref = getProductWorkspaceHref(analysisHistoryId);
  const workspaceAssetsHref = getProductWorkspaceHref(analysisHistoryId, "assets");
  const workspaceExportHref = getProductWorkspaceHref(analysisHistoryId, "export");
  const hasDetailPageAssets = creationCenterData.detailPages.length > 0;

  return (
    <main className="dashboard-content">
      {feedback ? <WorkspaceToast message={feedback.message} tone={feedback.tone} /> : null}
      <section className="product-detail-page-workspace">
        <section className="product-detail-page-hero cai-card cai-card--compact">
          <div>
            <Link className="product-detail-page-project-link" href={workspaceHref}>
              ← 返回当前商品
            </Link>
            <p className="eyebrow">Detail Page Tool</p>
            <h1>详情页制作</h1>
            <p>正在为「{productName}」规划详情页结构，并生成详情页图片素材。</p>
          </div>
          <div className="product-detail-page-hero-actions">
            <Link className="cai-button cai-button--secondary cai-button--sm" href={workspaceHref}>
              返回当前商品
            </Link>
            <Link className="cai-button cai-button--secondary cai-button--sm" href={workspaceAssetsHref}>
              查看素材库
            </Link>
            <Link className="cai-button cai-button--secondary cai-button--sm" href={workspaceExportHref}>
              导出素材包
            </Link>
          </div>
        </section>

        <section className="product-detail-page-context cai-card cai-card--compact" aria-label="当前商品详情页上下文">
          <div className="product-detail-page-original">
            {originalAssetUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={productName} decoding="async" src={originalAssetUrl} />
            ) : (
              <span>暂无原图</span>
            )}
          </div>
          <div className="product-detail-page-context-main">
            <span>当前商品</span>
            <strong>{productName}</strong>
            <p>{creationCenterData.analysis.category || "商品类别待补充"}</p>
          </div>
          <div className="product-detail-page-context-grid">
            <span>
              <em>发布目标</em>
              <strong>{formatProductOutputSettingsSummary(outputSettings)}</strong>
            </span>
            <span>
              <em>已生成详情页</em>
              <strong>{creationCenterData.detailPages.length} 张</strong>
            </span>
          </div>
        </section>

        <ProductDetailPagePanel
          analysisResult={productAnalysisResponse}
          generationBrief={generationBrief}
          outputSettings={outputSettings}
          onGenerated={handleGenerated}
          onOpenRiskConfirmations={openRiskConfirmations}
        />

        <section className="product-detail-page-existing cai-delivery-card">
          <div>
            <strong>{hasDetailPageAssets ? "详情页素材已生成" : "已有详情页素材"}</strong>
            <p>
              {hasDetailPageAssets
                ? `已生成 ${creationCenterData.detailPages.length} 张详情页图片，可回到当前商品的素材库查看、下载或导出素材包。`
                : "生成详情页图片后，可在当前商品的素材库和素材包中查看。"}
            </p>
          </div>
          <div>
            <Link className="cai-button cai-button--secondary cai-button--sm" href={workspaceAssetsHref}>
              查看素材库
            </Link>
            <Link className="cai-button cai-button--secondary cai-button--sm" href={workspaceExportHref}>
              导出素材包
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
