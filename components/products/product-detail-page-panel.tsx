"use client";

import { ProductDetailPagePlanPreview } from "@/components/products/product-detail-page-plan-preview";
import { ProductGenerationCostHint } from "@/components/products/product-generation-cost-hint";
import { AiThinkingLoading } from "@/components/ui/loading";
import { fetchWithAuthHandling } from "@/lib/authenticated-fetch";
import {
  DETAIL_PAGE_MODULE_DEFINITIONS,
  DETAIL_PAGE_MODULE_TYPES,
  type DetailPageModuleType,
  type DetailPageProjectOperation,
  type DetailPageProjectV2,
  type DetailPageStylePreset,
} from "@/lib/detail-page-project";
import { createGenerationAttempt } from "@/lib/generation-request";
import type { ProductAnalysisResponse, ProductGenerationBrief, ProductOutputSettings } from "@/lib/product-types";
import { useEffect, useMemo, useState } from "react";

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

export function ProductDetailPagePanel({ analysisResult, generationBrief, outputSettings }: ProductDetailPagePanelProps) {
  const analysisHistoryId = analysisResult?.historyId || "";
  const [addModuleType, setAddModuleType] = useState<DetailPageModuleType>("PRODUCT_DETAIL");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [project, setProject] = useState<DetailPageProjectV2 | null>(null);
  const [sectionCount, setSectionCount] = useState(7);
  const [source, setSource] = useState<ProjectResponse["source"]>();
  const [style, setStyle] = useState<DetailPageStylePreset>("ecommerce");

  async function loadProject() {
    if (!analysisHistoryId) {
      setProject(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetchWithAuthHandling(
        `/api/products/detail-page/plan?analysisHistoryId=${encodeURIComponent(analysisHistoryId)}`,
        { cache: "no-store" },
      );
      const data = await readProjectResponse(response);
      setProject(data?.project || null);
      setSource(data?.source);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "详情页策划读取失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProject();
    // loadProject intentionally follows the selected product context only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisHistoryId]);

  const summary = useMemo(() => {
    const counts = {
      READY: 0,
      NEEDS_INPUT: 0,
      EXISTING_ASSET: 0,
      OPTIONAL: 0,
    };

    project?.sections.forEach((section) => {
      counts[section.readiness] += 1;
    });

    return counts;
  }, [project]);

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
        await loadProject();
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
        <strong>策划</strong>
        <span>制作</span>
        <span>预览与导出</span>
      </div>

      <div className="dashboard-section-header">
        <div>
          <p className="product-workspace-kicker">Detail Page V2 · Phase 1</p>
          <h2>详情页策划</h2>
          <p className="image-generation-intro">先确定页面结构和事实依据，再进入素材制作。AI 分析不会自动成为已验证事实。</p>
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
              {summary.EXISTING_ASSET ? <span>已有素材 {summary.EXISTING_ASSET}</span> : null}
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

          <ProductDetailPagePlanPreview project={project} isUpdating={isUpdating} onOperation={(operation) => void handleOperation(operation)} />

          <div className="product-detail-v2-add-module">
            <label>
              <span>添加模块</span>
              <select disabled={isUpdating || project.sections.length >= 8} value={addModuleType} onChange={(event) => setAddModuleType(event.target.value as DetailPageModuleType)}>
                {DETAIL_PAGE_MODULE_TYPES.map((moduleType) => (
                  <option key={moduleType} value={moduleType}>
                    {DETAIL_PAGE_MODULE_DEFINITIONS[moduleType].label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="cai-button cai-button--secondary"
              disabled={isUpdating || project.sections.length >= 8}
              type="button"
              onClick={() => void handleOperation({ type: "add-section", moduleType: addModuleType })}
            >
              添加到末尾
            </button>
          </div>
          <p className="product-detail-plan-note">Phase 1 只保存结构与证据。本阶段不会生成新图片，也不会自动匹配已有素材。</p>
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
    </section>
  );
}
