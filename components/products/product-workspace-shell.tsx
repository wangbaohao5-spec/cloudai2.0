"use client";

import { ProductWorkspaceRail } from "@/components/products/product-workspace-rail";
import { ProductWorkspaceTabs } from "@/components/products/product-workspace-tabs";
import { AiThinkingLoading } from "@/components/ui/loading";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { WorkspaceToast } from "@/components/ui/workspace-toast";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import { formatProductOutputSettingsSummary, sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

type ProductWorkspaceShellProps = {
  initialAnalysisHistoryId?: string;
  mode?: "workspace" | "create";
  restoreFromRecent?: boolean;
};

type ProductWorkspaceStartPanelProps = {
  error: string;
  isAnalyzing: boolean;
  isRestoring: boolean;
  isUploading: boolean;
  onAnalyze: () => void;
  onFileSelect: (file: File) => void;
  onProductHintChange: (value: string) => void;
  productHint: string;
  uploadedAsset: UploadedAsset | null;
};

const PRODUCT_WORKFLOW_ANALYSIS_STORAGE_KEY = "cloudai:products:last-analysis-history-id";
const START_WORKSPACE_CAPABILITIES = [
  { description: "整理商品定位与卖点", label: "商品策划" },
  { description: "生成标题与商品卖点", label: "上架文案" },
  { description: "保持商品一致性的精修", label: "原图优化" },
  { description: "生成适配上架的成套商品图", label: "商品套图" },
  { description: "统一整理当前商品素材", label: "素材库" },
  { description: "汇总交付素材", label: "素材包" },
];

function getObjectField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function getGeneratedCount(creationCenterData: ProductCreationCenterData | null) {
  if (!creationCenterData) {
    return 0;
  }

  return (
    creationCenterData.copywriting.length +
    creationCenterData.imageEdits.length +
    creationCenterData.sceneImages.length +
    creationCenterData.detailPages.length +
    creationCenterData.imageSetImages.length
  );
}

function getLatestOutputSettings(creationCenterData: ProductCreationCenterData | null) {
  if (!creationCenterData) {
    return null;
  }

  const records = [
    ...creationCenterData.copywriting,
    ...creationCenterData.imageEdits,
    ...creationCenterData.sceneImages,
    ...creationCenterData.detailPages,
    ...creationCenterData.imageSetImages,
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  for (const record of records) {
    const inputSettings = sanitizeProductOutputSettings(getObjectField(record.input, "outputSettings"));
    const outputSettings = sanitizeProductOutputSettings(getObjectField(record.output, "outputSettings"));
    const settings = inputSettings || outputSettings;

    if (settings) {
      return settings;
    }
  }

  return null;
}

function getProjectTitle(creationCenterData: ProductCreationCenterData | null, result: ProductAnalysisResponse | null, uploadedAsset: UploadedAsset | null) {
  return (
    creationCenterData?.analysis.productNameSuggestions[0]?.trim() ||
    result?.analysis.productNameSuggestions[0]?.trim() ||
    creationCenterData?.product.title?.trim() ||
    result?.title?.trim() ||
    uploadedAsset?.name?.trim() ||
    "未命名商品"
  );
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

function ProductWorkspaceStartPanel({
  error,
  isAnalyzing,
  isRestoring,
  isUploading,
  onAnalyze,
  onFileSelect,
  onProductHintChange,
  productHint,
  uploadedAsset,
}: ProductWorkspaceStartPanelProps) {
  const isPendingAnalysis = Boolean(uploadedAsset) || isUploading;
  const isBusy = isUploading || isAnalyzing || isRestoring;
  const buttonLabel = isUploading ? "图片上传中..." : isAnalyzing ? "正在进行商品策划..." : "开始商品策划";
  const statusLabel = isAnalyzing ? "正在策划" : isUploading ? "上传中" : uploadedAsset ? "商品图片已准备" : "未上传";
  const statusDescription = isAnalyzing
    ? "CloudAI 正在理解商品信息并生成商品策划。"
    : isUploading
      ? "商品图片正在上传，请稍等。"
      : uploadedAsset
        ? "你可以继续补充商品信息，或直接开始商品策划。"
        : "请先上传一张主体清晰的商品图片。";

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      onFileSelect(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      onFileSelect(file);
    }
  }

  if (isRestoring) {
    return (
      <section className="product-workspace-start product-workspace-start--loading" aria-label="正在恢复商品项目">
        <div className="cai-empty product-workspace-start-loading">
          <div className="cai-empty__icon" aria-hidden="true">
            ...
          </div>
          <h2 className="cai-empty__title">正在恢复商品项目</h2>
          <p className="cai-empty__description">CloudAI 正在读取当前商品分析记录，请稍等片刻。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="product-workspace-start" aria-label={isPendingAnalysis ? "待分析商品" : "开始商品创作"}>
      <div className="product-workspace-start-header">
        <p className="eyebrow">{isPendingAnalysis ? "Pending Analysis" : "Product Workspace"}</p>
        <h1>商品工作台</h1>
        <p>
          {isPendingAnalysis
            ? "请确认商品图片和补充信息，然后开始商品策划。"
            : "上传一张商品图片，CloudAI 会先理解商品信息，再为后续上架文案、原图优化、商品套图和素材整理建立统一创作上下文。"}
        </p>
      </div>

      <div className="product-workspace-start-grid">
        <section className="cai-card product-workspace-start-upload-card" aria-label="上传商品图">
          <div className="product-workspace-start-section-header">
            <span>01</span>
            <div>
              <h2>上传商品图</h2>
              <p>支持 PNG、JPG、WebP。建议选择主体完整、光线清楚的商品原图。</p>
            </div>
          </div>

          <label
            className={`product-workspace-start-upload ${uploadedAsset?.url ? "has-preview" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input accept="image/png,image/jpeg,image/webp" type="file" onChange={handleFileInputChange} />
            {uploadedAsset?.url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={uploadedAsset.name || "商品图片预览"} src={uploadedAsset.url} />
                <span>{uploadedAsset.name}</span>
                <em>点击可更换图片</em>
              </>
            ) : (
              <div>
                <strong>{isUploading ? "图片上传中..." : "拖拽或点击选择商品图"}</strong>
                <p>上传后会在这里预览，确认无误后开始商品策划。</p>
              </div>
            )}
          </label>

          <details className="product-upload-tips product-workspace-start-tips">
            <summary>查看上传建议</summary>
            <ul>
              <li>商品主体完整，边缘不要被裁切</li>
              <li>光线清楚，避免严重反光或过暗</li>
              <li>服装、包包、首饰建议保留关键细节</li>
              <li>有 Logo、图案、版型时可在补充信息中注明必须保留</li>
            </ul>
          </details>
        </section>

        <section className="cai-card product-workspace-start-brief-card" aria-label="商品补充信息">
          <div className="product-workspace-start-section-header">
            <span>02</span>
            <div>
              <h2>商品补充信息（可选）</h2>
              <p>补充型号、规格、颜色、材质、卖点或必须保留的细节，能让 AI 更准确地完成商品策划。</p>
            </div>
          </div>

          <textarea
            className="cai-textarea product-workspace-start-textarea"
            maxLength={1000}
            placeholder="例如：这是一款粉蓝配色机械键盘，粉色背光，右下角卡通图案是键盘设计的一部分，请保留键盘整体布局、粉蓝配色、粉色灯光和卡通图案位置。"
            rows={5}
            value={productHint}
            onChange={(event) => onProductHintChange(event.target.value)}
          />
          <div className="product-workspace-start-hint-row">
            <span>{productHint.trim().length ? `${productHint.trim().length}/1000` : "不填写也可以直接开始策划"}</span>
          </div>
        </section>
      </div>

      <section className="cai-card cai-card--compact product-workspace-start-action" aria-label="开始商品策划">
        <div className="product-workspace-start-status" aria-live="polite">
          <strong>{statusLabel}</strong>
          <span>{statusDescription}</span>
        </div>
        <button className="cai-button cai-button--primary" disabled={!uploadedAsset || isBusy} type="button" onClick={onAnalyze}>
          {isAnalyzing ? <AiThinkingLoading size="sm" /> : isUploading || isRestoring ? <LoadingIndicator /> : null}
          {buttonLabel}
        </button>
        <p>商品策划完成后，后续图片生成会按实际任务消耗额度。</p>
        {error ? <p className="image-generation-error">{error}</p> : null}
      </section>

      <aside className="cai-card cai-card--muted product-workspace-start-guide" aria-label="策划完成后可以继续">
        <div>
          <strong>策划完成后可以继续</strong>
          <p>围绕同一个商品上下文继续完成文案、图片、套图和素材交付。</p>
        </div>
        <div className="product-workspace-capability-grid" aria-label="商品工作台能力预览">
          {START_WORKSPACE_CAPABILITIES.map((capability) => (
            <div className="product-workspace-capability-item" key={capability.label}>
              <strong>{capability.label}</strong>
              <span>{capability.description}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}

function getProductWorkspaceHref(analysisHistoryId: string) {
  return `/dashboard/products?analysis=${encodeURIComponent(analysisHistoryId)}`;
}

function ProductProjectContextHeader({
  creationCenterData,
  result,
  uploadedAsset,
}: {
  creationCenterData: ProductCreationCenterData | null;
  result: ProductAnalysisResponse | null;
  uploadedAsset: UploadedAsset | null;
}) {
  const analysisHistoryId = result?.historyId || creationCenterData?.product.analysisHistoryId;
  const productName = getProjectTitle(creationCenterData, result, uploadedAsset);
  const category = creationCenterData?.analysis.category || result?.analysis.category || "";
  const generatedCount = getGeneratedCount(creationCenterData);
  const outputSettings = getLatestOutputSettings(creationCenterData);
  const imageUrl = creationCenterData?.originalAsset?.previewUrl || creationCenterData?.originalAsset?.url || uploadedAsset?.url || "";

  return (
    <section className="product-project-context-header" aria-label="当前商品项目">
      <div className="product-project-context-main">
        <Link className="product-project-context-back" href="/dashboard/products">
          ← 商品工作台
        </Link>
        <div className="product-project-context-summary">
          <div className="product-project-context-thumb">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={productName} decoding="async" src={imageUrl} />
            ) : (
              <span>商</span>
            )}
          </div>
          <div className="product-project-context-copy">
            <p className="eyebrow">当前商品项目</p>
            <h1>{productName}</h1>
            <div>
              {category ? <span>{category}</span> : null}
              {outputSettings ? <span>{formatProductOutputSettingsSummary(outputSettings)}</span> : null}
              <span>{generatedCount ? `已生成 ${generatedCount} 项素材` : "素材待生成"}</span>
            </div>
          </div>
        </div>
      </div>

      {analysisHistoryId ? (
        <Link className="cai-button cai-button--secondary cai-button--sm" href={`/dashboard/detail-page?analysis=${encodeURIComponent(analysisHistoryId)}`}>
          详情页制作
        </Link>
      ) : null}
    </section>
  );
}

export function ProductWorkspaceShell({ initialAnalysisHistoryId = "", mode = "workspace", restoreFromRecent = false }: ProductWorkspaceShellProps = {}) {
  const [error, setError] = useState("");
  const [creationCenterError, setCreationCenterError] = useState("");
  const [creationCenterData, setCreationCenterData] = useState<ProductCreationCenterData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreationCenterLoading, setIsCreationCenterLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasCheckedInitialRestore, setHasCheckedInitialRestore] = useState(() => mode === "create" || (!initialAnalysisHistoryId && !restoreFromRecent));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAsset, setUploadedAsset] = useState<UploadedAsset | null>(null);
  const [creationCenterRefreshKey, setCreationCenterRefreshKey] = useState(0);
  const [productHint, setProductHint] = useState("");
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
    const urlAnalysisHistoryId = mode === "create" ? "" : initialAnalysisHistoryId || new URLSearchParams(window.location.search).get("analysis")?.trim() || "";
    const analysisHistoryId = urlAnalysisHistoryId || (restoreFromRecent ? getStoredAnalysisHistoryId() : "");

    async function restoreProductWorkspace() {
      if (!analysisHistoryId) {
        if (isMounted) {
          setHasCheckedInitialRestore(true);
        }
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
          setHasCheckedInitialRestore(true);
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
  }, [initialAnalysisHistoryId, mode, restoreFromRecent]);

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

  async function uploadProductFile(file: File) {
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void uploadProductFile(file);
    }
  }

  async function handleAnalyze() {
    if (!uploadedAsset) {
      setError("请先上传商品图片。");
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
          productHint: productHint.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "商品分析失败，请稍后重试。");
      }

      const data = (await response.json()) as ProductAnalysisResponse;
      setResult(data);
      setCreationCenterRefreshKey(0);

      if (data.historyId) {
        saveStoredAnalysisHistoryId(data.historyId);

        if (mode === "create") {
          window.location.assign(getProductWorkspaceHref(data.historyId));
          return;
        }

        updateAnalysisUrl(data.historyId);
      }
      showToast("商品分析完成，可以继续生成素材");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "商品分析失败，请稍后重试。";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleGenerated() {
    setCreationCenterRefreshKey((value) => value + 1);
  }

  const hasAnalysis = Boolean(result);
  const isInitialRestorePending = !hasCheckedInitialRestore || isRestoring;
  const hasUploadedAsset = Boolean(uploadedAsset) || isUploading;
  const workspaceMode = isInitialRestorePending ? "restoring" : hasAnalysis ? "workspace" : hasUploadedAsset ? "pending" : "initial";
  const shouldShowFullWorkspace = workspaceMode === "workspace";

  if (!shouldShowFullWorkspace) {
    return (
      <main className="dashboard-content">
        {feedback ? <WorkspaceToast message={feedback.message} tone={feedback.tone} /> : null}
        <ProductWorkspaceStartPanel
          error={error}
          isAnalyzing={isAnalyzing}
          isRestoring={isInitialRestorePending}
          isUploading={isUploading}
          productHint={productHint}
          uploadedAsset={uploadedAsset}
          onAnalyze={() => void handleAnalyze()}
          onFileSelect={(file) => void uploadProductFile(file)}
          onProductHintChange={setProductHint}
        />
      </main>
    );
  }

  return (
    <main className="dashboard-content">
      {feedback ? <WorkspaceToast message={feedback.message} tone={feedback.tone} /> : null}
      <ProductProjectContextHeader creationCenterData={creationCenterData} result={result} uploadedAsset={uploadedAsset} />
      <section className="product-workspace-shell">
        <ProductWorkspaceRail
          creationCenterData={creationCenterData}
          error={error}
          isAnalyzing={isAnalyzing}
          isRestoring={isRestoring}
          isUploading={isUploading}
          mode={workspaceMode}
          result={result}
          productHint={productHint}
          uploadedAsset={uploadedAsset}
          onAnalyze={() => void handleAnalyze()}
          onFileChange={handleFileChange}
          onProductHintChange={setProductHint}
        />
        <ProductWorkspaceTabs
          creationCenterData={creationCenterData}
          creationCenterError={creationCenterError}
          isAnalyzing={isAnalyzing}
          isCreationCenterLoading={isCreationCenterLoading}
          isUploading={isUploading}
          result={result}
          uploadedAsset={uploadedAsset}
          onAnalyze={() => void handleAnalyze()}
          onGenerated={handleGenerated}
        />
      </section>
    </main>
  );
}
