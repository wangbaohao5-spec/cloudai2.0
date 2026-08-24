"use client";

import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import { formatProductOutputSettingsSummary, sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import type { ProductAnalysisResponse } from "@/lib/product-types";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

type ProductWorkspaceRailProps = {
  creationCenterData: ProductCreationCenterData | null;
  error: string;
  isAnalyzing: boolean;
  isRestoring: boolean;
  isUploading: boolean;
  mode?: "initial" | "pending" | "restoring" | "workspace";
  onAnalyze: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProductHintChange: (value: string) => void;
  productHint: string;
  result: ProductAnalysisResponse | null;
  uploadedAsset: UploadedAsset | null;
};

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

function getObjectField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
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

function getWorkspaceStatus({
  creationCenterData,
  result,
  uploadedAsset,
}: {
  creationCenterData: ProductCreationCenterData | null;
  result: ProductAnalysisResponse | null;
  uploadedAsset: UploadedAsset | null;
}) {
  if (!uploadedAsset) {
    return {
      label: "未上传",
      description: "上传商品原图后，CloudAI 会创建当前商品创作上下文。",
    };
  }

  if (!result) {
    return {
      label: "待分析",
      description: "商品图片已准备好，下一步进行 AI 商品分析。",
    };
  }

  const generatedCount = getGeneratedCount(creationCenterData);

  if (generatedCount > 0) {
    return {
      label: "已生成素材",
      description: `当前商品已有 ${generatedCount} 个上架文案或视觉素材，可继续补充并导出素材包。`,
    };
  }

  return {
    label: "已分析",
    description: "商品分析已完成，可以继续生成上架文案、原图优化和商品套图。",
  };
}

function getWorkspaceTabHref(analysisHistoryId: string | undefined, tab: "assets" | "export" | "image-set") {
  if (!analysisHistoryId) {
    return "/dashboard/products";
  }

  const params = new URLSearchParams({ analysis: analysisHistoryId, tab });

  return `/dashboard/products?${params.toString()}`;
}

function getDetailPageHref(analysisHistoryId?: string) {
  return analysisHistoryId ? `/dashboard/detail-page?analysis=${encodeURIComponent(analysisHistoryId)}` : "/dashboard/detail-page";
}

export function ProductWorkspaceRail({
  creationCenterData,
  error,
  isUploading,
  mode = "workspace",
  result,
  uploadedAsset,
}: ProductWorkspaceRailProps) {
  const status = getWorkspaceStatus({ creationCenterData, result, uploadedAsset });
  const analysisHistoryId = result?.historyId || creationCenterData?.product.analysisHistoryId;
  const generatedCount = getGeneratedCount(creationCenterData);
  const outputSettings = getLatestOutputSettings(creationCenterData);
  const productName = result?.analysis.productNameSuggestions[0] || result?.title || creationCenterData?.product.title || uploadedAsset?.name || "当前商品";

  if (mode !== "workspace") {
    const railStatus =
      mode === "restoring"
        ? {
            label: "正在恢复",
            description: "CloudAI 正在读取最近商品，请稍等片刻。",
          }
        : mode === "pending"
          ? {
              label: "待策划",
              description: "商品图片已准备好，请在主区域确认补充信息并开始商品策划。",
            }
          : {
              label: "未开始",
              description: "先上传商品图片，CloudAI 会创建当前商品创作上下文。",
            };

    return (
      <aside className="product-workspace-rail product-workspace-rail--start">
        <div className="product-workspace-rail-section product-workspace-rail-heading">
          <p className="eyebrow">商品工作台</p>
          <h2>{mode === "pending" ? "等待商品策划" : "等待上传商品图"}</h2>
          <p className="image-generation-intro">{railStatus.description}</p>
        </div>

        <div className="product-workspace-status" aria-live="polite">
          <div>
            <span>当前状态</span>
            <p>{railStatus.description}</p>
          </div>
          <strong>{railStatus.label}</strong>
        </div>

        <section className="product-workflow-mini-steps is-compact" aria-label="轻量创建流程">
          <strong>创建流程</strong>
          <div>
            {["上传商品图", "商品策划", "商品套图", "素材库", "素材包"].map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </section>

        {uploadedAsset ? (
          <div className="product-workspace-pending-summary">
            <strong>{uploadedAsset.name}</strong>
            <p>{isUploading ? "商品图片正在上传，请稍等。" : "图片已上传，可在主区域开始商品策划。"}</p>
          </div>
        ) : null}

        {error ? <p className="image-generation-error">{error}</p> : null}
      </aside>
    );
  }

  return (
    <aside className="product-workspace-rail">
      <div className="product-workspace-rail-section product-workspace-rail-heading">
        <p className="eyebrow">当前进度</p>
        <h2>创作状态</h2>
        <p className="image-generation-intro">围绕当前商品继续生成、整理和导出素材。</p>
      </div>

      <section className="product-workspace-summary" id="product-upload-section" aria-label="当前商品摘要">
        <div className="product-workspace-rail-product">
          <div className="product-upload-preview">
            {uploadedAsset?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={uploadedAsset.name || "商品图片预览"} src={uploadedAsset.url} />
            ) : (
              <p>当前商品图片暂不可用。</p>
            )}
          </div>
          <div>
            <span>当前商品</span>
            <strong>{productName}</strong>
          </div>
        </div>
      </section>

      <section className="product-workspace-rail-meta" aria-label="当前商品创作摘要">
        <div>
          <span>发布目标</span>
          <strong>{outputSettings ? formatProductOutputSettingsSummary(outputSettings) : "在商品策划中设置"}</strong>
        </div>
        <div>
          <span>素材数量</span>
          <strong>{generatedCount ? `${generatedCount} 项` : "待生成"}</strong>
        </div>
      </section>

      <div className="product-workspace-status" aria-live="polite">
        <div>
          <span>当前状态</span>
          <p>{status.description}</p>
        </div>
        <strong>{status.label}</strong>
      </div>

      {result ? (
        <section className="product-workspace-rail-next" aria-label="下一步建议">
          <div>
            <strong>下一步建议</strong>
            <span>{generatedCount ? `已生成 ${generatedCount} 项素材，可继续补充或导出。` : "建议先生成商品套图，再查看素材库并导出。"}</span>
          </div>
          <div className="product-workspace-rail-next-actions">
            <a className="button primary" href={getWorkspaceTabHref(analysisHistoryId, "image-set")}>
              生成套图
            </a>
            <a className="button secondary" href={getWorkspaceTabHref(analysisHistoryId, "assets")}>
              查看素材库
            </a>
            <a className="button secondary" href={getWorkspaceTabHref(analysisHistoryId, "export")}>
              导出
            </a>
          </div>
          <a className="product-workspace-rail-detail-link" href={getDetailPageHref(analysisHistoryId)}>
            详情页制作
          </a>
        </section>
      ) : null}
      {error ? <p className="image-generation-error">{error}</p> : null}
    </aside>
  );
}
