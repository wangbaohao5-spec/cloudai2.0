"use client";

import { ProductDetailPageContinuousPreview } from "@/components/products/product-detail-page-continuous-preview";
import { ProductDetailPagePlanPreview } from "@/components/products/product-detail-page-plan-preview";
import { ProductGenerationCostHint } from "@/components/products/product-generation-cost-hint";
import { AiThinkingLoading } from "@/components/ui/loading";
import { fetchWithAuthHandling } from "@/lib/authenticated-fetch";
import {
  DETAIL_PAGE_MODULE_DEFINITIONS,
  DETAIL_PAGE_MODULE_TYPES,
  getDetailPageSectionEffectiveState,
  type DetailPageAssetCandidate,
  type DetailPageGenerationEventType,
  type DetailPageNavigationType,
  type DetailPageModuleType,
  type DetailPageProjectOperation,
  type DetailPageProjectV2,
  type DetailPageStylePreset,
} from "@/lib/detail-page-project";
import { createGenerationAttempt } from "@/lib/generation-request";
import type { ProductAnalysisResponse, ProductGenerationBrief, ProductOutputSettings } from "@/lib/product-types";
import { useEffect, useMemo, useRef, useState } from "react";

type ProductDetailPagePanelProps = {
  analysisResult: ProductAnalysisResponse | null;
  generationBrief?: ProductGenerationBrief | null;
  outputSettings?: ProductOutputSettings | null;
  onGenerated?: () => void;
  onOpenRiskConfirmations?: () => void;
};

type ProjectResponse = {
  project: DetailPageProjectV2 | null;
  source?: "ai" | "fallback" | "recovered";
};

type AssetCandidatesResponse = {
  candidates: DetailPageAssetCandidate[];
};

type SectionGenerationResponse = {
  candidate: DetailPageAssetCandidate | null;
  error?: string;
  project: DetailPageProjectV2;
  recovered: boolean;
  warning?: string | null;
};

type GenerationIntentResponse = {
  error?: string;
  intentId: string;
  project: DetailPageProjectV2;
};

type PendingSectionGeneration = {
  attempt: ReturnType<typeof createGenerationAttempt>;
  expectedRevision: number;
  intentId: string;
};

type ExportErrorResponse = {
  error?: string;
};

const styleOptions: Array<{ label: string; value: DetailPageStylePreset }> = [
  { value: "ecommerce", label: "电商清晰" },
  { value: "brand-site", label: "品牌克制" },
  { value: "minimal", label: "极简留白" },
  { value: "xiaohongshu", label: "自然内容感" },
];

async function readProjectResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as (ProjectResponse & { error?: string }) | null;

  if (!response.ok) {
    throw new Error(data?.error || "详情页策划暂时不可用，请稍后重试。");
  }

  return data;
}

async function readAssetCandidatesResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as (AssetCandidatesResponse & { error?: string }) | null;

  if (!response.ok) {
    throw new Error(data?.error || "已有素材暂时无法读取，请稍后重试。");
  }

  return data?.candidates || [];
}

async function readSectionGenerationResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as SectionGenerationResponse | null;

  if (!response.ok || !data) {
    throw new Error(data?.error || "详情页视觉生成失败，请稍后重试。");
  }

  return data;
}

async function readGenerationIntentResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as GenerationIntentResponse | null;
  if (!response.ok || !data?.intentId || !data.project) {
    throw new Error(data?.error || "制作请求创建失败，请重新点击生成。");
  }
  return data;
}

function getNavigationType(): DetailPageNavigationType {
  const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return entry?.type === "navigate" || entry?.type === "reload" || entry?.type === "back_forward" || entry?.type === "prerender"
    ? entry.type
    : "unknown";
}

function getDownloadFilename(response: Response, fallback: string) {
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([a-zA-Z0-9._-]+)"/);
  return match?.[1] || fallback;
}

export function ProductDetailPagePanel({ analysisResult, generationBrief, outputSettings, onGenerated }: ProductDetailPagePanelProps) {
  const analysisHistoryId = analysisResult?.historyId || "";
  const [addModuleType, setAddModuleType] = useState<DetailPageModuleType>("PRODUCT_DETAIL");
  const [assetError, setAssetError] = useState("");
  const [candidates, setCandidates] = useState<DetailPageAssetCandidate[]>([]);
  const [error, setError] = useState("");
  const [downloadingExport, setDownloadingExport] = useState<"full" | string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [generatingSectionId, setGeneratingSectionId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [project, setProject] = useState<DetailPageProjectV2 | null>(null);
  const [sectionCount, setSectionCount] = useState(7);
  const [source, setSource] = useState<ProjectResponse["source"]>();
  const [style, setStyle] = useState<DetailPageStylePreset>("ecommerce");
  const [viewMode, setViewMode] = useState<"build" | "preview">("build");
  const generationAttemptsRef = useRef(new Map<string, PendingSectionGeneration>());

  async function loadWorkspaceState() {
    if (!analysisHistoryId) {
      setProject(null);
      setCandidates([]);
      return;
    }

    setIsLoading(true);
    setIsLoadingAssets(true);
    setError("");
    setAssetError("");

    const query = encodeURIComponent(analysisHistoryId);
    const [projectResult, assetsResult] = await Promise.allSettled([
      fetchWithAuthHandling(`/api/products/detail-page/plan?analysisHistoryId=${query}`, { cache: "no-store" }).then(readProjectResponse),
      fetchWithAuthHandling(`/api/products/detail-page/assets?analysisHistoryId=${query}`, { cache: "no-store" }).then(readAssetCandidatesResponse),
    ]);

    if (projectResult.status === "fulfilled") {
      setProject(projectResult.value?.project || null);
      setSource(projectResult.value?.source);
    } else {
      setError(projectResult.reason instanceof Error ? projectResult.reason.message : "详情页策划读取失败，请稍后重试。");
    }

    if (assetsResult.status === "fulfilled") {
      setCandidates(assetsResult.value);
    } else {
      setCandidates([]);
      setAssetError(assetsResult.reason instanceof Error ? assetsResult.reason.message : "已有素材暂时无法读取，请稍后重试。");
    }

    setIsLoading(false);
    setIsLoadingAssets(false);
  }

  useEffect(() => {
    setViewMode("build");
    void loadWorkspaceState();
    // The loader intentionally follows the selected product context only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisHistoryId]);

  const summary = useMemo(() => {
    const counts = {
      READY: 0,
      NEEDS_INPUT: 0,
      EXISTING_ASSET: 0,
      OPTIONAL: 0,
    };

    const candidateMap = new Map(candidates.map((candidate) => [candidate.assetId, candidate]));
    let boundAssets = 0;
    let completed = 0;

    project?.sections.forEach((section) => {
      const selectedCandidate = section.selectedAssetId ? candidateMap.get(section.selectedAssetId) : null;
      const selectedAssetAvailable = Boolean(selectedCandidate);
      const effectiveState = getDetailPageSectionEffectiveState(section, selectedAssetAvailable);
      counts[effectiveState.readiness] += 1;
      if (effectiveState.complete) completed += 1;
      if (selectedCandidate) boundAssets += 1;
    });

    return { ...counts, boundAssets, completed };
  }, [candidates, project]);

  async function handleCreatePlan() {
    if (!analysisHistoryId) {
      setError("请先完成商品分析，再创建详情页策划。");
      return;
    }

    setError("");
    setIsCreating(true);

    try {
      const generationAttempt = createGenerationAttempt();
      const response = await generationAttempt.fetch("/api/products/detail-page/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisHistoryId,
          generationBrief: generationBrief || undefined,
          outputSettings: outputSettings || undefined,
          sectionCount,
          style,
        }),
      });
      const data = await readProjectResponse(response);
      setProject(data?.project || null);
      setSource(data?.source);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "详情页策划创建失败，请稍后重试。");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleOperation(operation: DetailPageProjectOperation) {
    if (!project || isUpdating) {
      return;
    }

    setError("");
    setIsUpdating(true);

    try {
      const response = await fetchWithAuthHandling("/api/products/detail-page/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisHistoryId,
          expectedRevision: project.revision,
          operation,
        }),
      });

      if (response.status === 409) {
        await loadWorkspaceState();
        throw new Error("策划已在另一个页面更新，已重新读取最新版本。");
      }

      const data = await readProjectResponse(response);
      setProject(data?.project || null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "详情页策划更新失败，请稍后重试。");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleGenerateSection(sectionId: string) {
    if (!project || generatingSectionId) return;

    const section = project.sections.find((item) => item.id === sectionId);
    if (!section) return;

    setError("");
    setGeneratingSectionId(sectionId);
    let receivedResponse = false;

    try {
      let pending = generationAttemptsRef.current.get(sectionId);

      if (!pending) {
        const attempt = createGenerationAttempt();
        const reusableIntent = section.generationIntent &&
          !section.generationIntent.consumedAt &&
          Date.parse(section.generationIntent.expiresAt) > Date.now()
          ? section.generationIntent
          : null;

        if (reusableIntent) {
          pending = { attempt, expectedRevision: project.revision, intentId: reusableIntent.id };
        } else {
          const eventType: DetailPageGenerationEventType = section.selectedAssetId
            ? "regenerate-click"
            : section.lifecycle === "FAILED"
              ? "retry-click"
              : "generate-click";
          const intentResponse = await fetchWithAuthHandling("/api/products/detail-page/sections/intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analysisHistoryId,
              eventType,
              expectedRevision: project.revision,
              navigationType: getNavigationType(),
              pagePhase: viewMode,
              sectionId,
            }),
          }).then(readGenerationIntentResponse);
          pending = { attempt, expectedRevision: intentResponse.project.revision, intentId: intentResponse.intentId };
          setProject(intentResponse.project);
        }

        generationAttemptsRef.current.set(sectionId, pending);
      }

      const response = await pending.attempt.fetch("/api/products/detail-page/sections/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisHistoryId,
          expectedRevision: pending.expectedRevision,
          intentId: pending.intentId,
          outputSettings: outputSettings || undefined,
          sectionId,
        }),
      });
      receivedResponse = true;
      const data = await readSectionGenerationResponse(response);
      generationAttemptsRef.current.delete(sectionId);
      setProject(data.project);

      if (data.candidate) {
        setCandidates((current) => [data.candidate!, ...current.filter((candidate) => candidate.assetId !== data.candidate?.assetId)]);
      }

      if (data.warning) setError(data.warning);
      onGenerated?.();
    } catch (caughtError) {
      if (receivedResponse) generationAttemptsRef.current.delete(sectionId);
      await loadWorkspaceState();
      setError(caughtError instanceof Error ? caughtError.message : "详情页视觉生成失败，请稍后重试。");
    } finally {
      setGeneratingSectionId("");
    }
  }

  async function handleDownloadExport(mode: "full" | "section", sectionId?: string) {
    if (!project || downloadingExport) return;

    const downloadKey = mode === "full" ? "full" : sectionId || "section";
    setError("");
    setDownloadingExport(downloadKey);

    try {
      const response = await fetchWithAuthHandling("/api/products/detail-page/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisHistoryId,
          expectedRevision: project.revision,
          mode,
          projectId: project.projectId,
          sectionId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ExportErrorResponse | null;
        if (response.status === 409) await loadWorkspaceState();
        throw new Error(data?.error || "详情页暂时无法导出，请稍后重试。");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = getDownloadFilename(response, mode === "full" ? "vahoro-detail-page.jpg" : "detail-page-section.jpg");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "详情页暂时无法导出，请稍后重试。");
    } finally {
      setDownloadingExport("");
    }
  }

  if (!analysisResult) {
    return (
      <section className="product-detail-page-panel product-workspace-tool-surface">
        <p className="product-workspace-kicker">详情页制作</p>
        <h2>Page Plan</h2>
        <p className="image-generation-intro">完成商品分析后，可以创建并保存详情页结构。</p>
      </section>
    );
  }

  return (
    <section className="product-detail-page-panel product-workspace-tool-surface">
      <div className="product-detail-v2-steps" aria-label="详情页制作阶段">
        <button className={!project ? "is-active" : ""} disabled={!project} type="button" onClick={() => setViewMode("build")}>策划</button>
        <button className={project && viewMode === "build" ? "is-active" : ""} disabled={!project} type="button" onClick={() => setViewMode("build")}>制作</button>
        <button className={project && viewMode === "preview" ? "is-active" : ""} disabled={!project} type="button" onClick={() => setViewMode("preview")}>预览与导出</button>
      </div>

      <div className="dashboard-section-header">
        <div>
          <p className="product-workspace-kicker">详情页制作</p>
          <h2>{viewMode === "preview" && project ? "预览与导出" : "详情页策划"}</h2>
          <p className="image-generation-intro">
            {viewMode === "preview" && project
              ? "将已完成模块组织为一条连续详情页，可下载完整长图或单个模块。"
              : "先确定页面结构和事实依据，再进入素材制作。AI 分析不会自动成为已验证事实。"}
          </p>
        </div>
        {project ? <span>Revision {project.revision}</span> : <span>策划准备</span>}
      </div>

      {isLoading ? (
        <div className="product-detail-plan-placeholder">
          <AiThinkingLoading size="sm" />
          <strong>正在恢复详情页策划...</strong>
        </div>
      ) : project ? (
        <>
          <div className="product-detail-v2-summary">
            <div>
              <strong>{project.sections.length} 个模块</strong>
              <span>刷新后会从服务器恢复当前策划</span>
            </div>
            <div>
              <span>可继续 {summary.READY}</span>
              <span>已完成 {summary.completed}</span>
              {summary.boundAssets ? <span>{summary.boundAssets} 个模块使用已有素材</span> : null}
              <span>需要补充 {summary.NEEDS_INPUT}</span>
              {summary.OPTIONAL ? <span>可选 {summary.OPTIONAL}</span> : null}
            </div>
          </div>

          <div className="product-detail-v2-style-summary">
            <strong>整页视觉方向</strong>
            <span>{project.pageStyle.mood}</span>
            <span>{project.pageStyle.palette}</span>
            <span>{project.pageStyle.lighting}</span>
            <span>{project.pageStyle.typography}</span>
            <span>{project.pageStyle.spacing}</span>
          </div>

          {source === "fallback" ? <p className="product-detail-v2-notice">AI 策划暂时不可用，当前使用可编辑的基础详情页结构。</p> : null}

          {viewMode === "preview" ? (
            <ProductDetailPageContinuousPreview
              candidates={candidates}
              downloadingExport={downloadingExport || undefined}
              generatingSectionId={generatingSectionId}
              isLoadingAssets={isLoadingAssets}
              isUpdating={isUpdating}
              project={project}
              onBackToBuild={() => setViewMode("build")}
              onDownloadExport={(mode, sectionId) => void handleDownloadExport(mode, sectionId)}
              onGenerateSection={(sectionId) => void handleGenerateSection(sectionId)}
              onOperation={(operation) => void handleOperation(operation)}
            />
          ) : (
            <>
              <ProductDetailPagePlanPreview
                candidates={candidates}
                generatingSectionId={generatingSectionId}
                isLoadingAssets={isLoadingAssets}
                project={project}
                isUpdating={isUpdating}
                onGenerateSection={(sectionId) => void handleGenerateSection(sectionId)}
                onOperation={(operation) => void handleOperation(operation)}
              />

              <div className="product-detail-v2-add-module">
                <label>
                  <span>添加模块</span>
                  <select disabled={isUpdating || generatingSectionId.length > 0 || project.sections.some((section) => section.lifecycle === "GENERATING") || project.sections.length >= 8} value={addModuleType} onChange={(event) => setAddModuleType(event.target.value as DetailPageModuleType)}>
                    {DETAIL_PAGE_MODULE_TYPES.map((moduleType) => (
                      <option key={moduleType} value={moduleType}>
                        {DETAIL_PAGE_MODULE_DEFINITIONS[moduleType].label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="cai-button cai-button--secondary"
                  disabled={isUpdating || generatingSectionId.length > 0 || project.sections.some((section) => section.lifecycle === "GENERATING") || project.sections.length >= 8}
                  type="button"
                  onClick={() => void handleOperation({ type: "add-section", moduleType: addModuleType })}
                >
                  添加到末尾
                </button>
              </div>
              <p className="product-detail-plan-note">复用已有素材保持零图片额度消耗；只有点击“生成视觉”才会创建新的图片任务。一次只制作一个模块。</p>
            </>
          )}
        </>
      ) : (
        <>
          <div className="product-detail-page-settings">
            <fieldset>
              <legend>推荐屏数</legend>
              <div className="product-detail-count-grid">
                {[5, 6, 7, 8].map((count) => (
                  <label className={sectionCount === count ? "active" : ""} key={count}>
                    <input checked={sectionCount === count} name="detailPageSectionCount" type="radio" value={count} onChange={() => setSectionCount(count)} />
                    <strong>{count} 屏</strong>
                    <span>{count === 7 ? "完整 MVP 结构" : "按商品内容密度规划"}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>视觉方向</legend>
              <div className="product-detail-style-grid">
                {styleOptions.map((option) => (
                  <label className={style === option.value ? "active" : ""} key={option.value}>
                    <input checked={style === option.value} name="detailPageStyle" type="radio" value={option.value} onChange={() => setStyle(option.value)} />
                    <strong>{option.label}</strong>
                    <span>作为整页共享方向保存</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="product-generation-action-stack">
            <ProductGenerationCostHint compact type="detail-page" estimatedCost={0} label="策划不会消耗图片额度" description="AI 策划按现有文案 Usage 规则记录；基础 fallback 不调用图片 Provider。" />
            <button className="cai-button cai-button--primary" disabled={isCreating} type="button" onClick={() => void handleCreatePlan()}>
              {isCreating ? (
                <>
                  <AiThinkingLoading size="sm" />
                  正在创建策划...
                </>
              ) : (
                "创建详情页策划"
              )}
            </button>
          </div>
        </>
      )}

      {error ? <p className="image-generation-error" role="alert">{error}</p> : null}
      {assetError ? <p className="image-generation-error" role="alert">{assetError} 已保存的策划仍可继续编辑。</p> : null}
    </section>
  );
}
