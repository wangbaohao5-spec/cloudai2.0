"use client";

import { ProductCreationProgress } from "@/components/products/product-creation-progress";
import { ProductCreationSummary } from "@/components/products/product-creation-summary";
import { AiThinkingLoading } from "@/components/ui/loading";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useState } from "react";

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
  onAnalyze: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  result: ProductAnalysisResponse | null;
  uploadedAsset: UploadedAsset | null;
};

const platformOptions = ["通用", "Amazon", "Shopee", "TikTok Shop"];

function getGeneratedCount(creationCenterData: ProductCreationCenterData | null) {
  if (!creationCenterData) {
    return 0;
  }

  return creationCenterData.copywriting.length + creationCenterData.imageEdits.length + creationCenterData.sceneImages.length;
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
      description: "上传商品原图后，CloudAI 会建立当前商品工作台。",
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
      description: `当前商品已有 ${generatedCount} 个文案或视觉素材，可继续补充并导出素材包。`,
    };
  }

  return {
    label: "已分析",
    description: "商品分析已完成，可以继续生成文案、图片和场景图。",
  };
}

export function ProductWorkspaceRail({
  creationCenterData,
  error,
  isAnalyzing,
  isRestoring,
  isUploading,
  onAnalyze,
  onFileChange,
  result,
  uploadedAsset,
}: ProductWorkspaceRailProps) {
  const [platform, setPlatform] = useState(platformOptions[0]);
  const status = getWorkspaceStatus({ creationCenterData, result, uploadedAsset });
  const analyzeLabel = result ? "重新分析商品" : "分析商品";
  const isPrimaryActionLoading = isUploading || isAnalyzing || isRestoring;

  return (
    <aside className="product-workspace-rail">
      <div className="product-workspace-rail-section product-workspace-rail-heading">
        <p className="eyebrow">商品工作台</p>
        <h2>商品来源</h2>
        <p className="image-generation-intro">上传一张商品图，完成分析后在右侧工作区生成素材。</p>
      </div>

      <section className="product-workspace-summary" aria-label="当前商品摘要">
        <div className="product-upload-box">
          <label>
            商品图片
            <input accept="image/png,image/jpeg,image/webp" type="file" onChange={onFileChange} />
          </label>
          <div className="product-upload-preview">
            {uploadedAsset?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={uploadedAsset.name || "商品图片预览"} src={uploadedAsset.url} />
            ) : (
              <p>选择一张商品图片开始创建素材。</p>
            )}
          </div>
        </div>

        {creationCenterData ? (
          <ProductCreationSummary
            analysis={creationCenterData.analysis}
            originalAsset={creationCenterData.originalAsset}
            product={creationCenterData.product}
          />
        ) : uploadedAsset ? (
          <div className="product-workspace-pending-summary">
            <strong>{uploadedAsset.name}</strong>
            <p>完成分析后会显示商品名称、类别和目标用户。</p>
          </div>
        ) : null}
      </section>

      <div className="product-workspace-status" aria-live="polite">
        <div>
          <span>当前状态</span>
          <p>{status.description}</p>
        </div>
        <strong>{status.label}</strong>
      </div>

      {creationCenterData ? (
        <div className="product-workspace-progress-wrap">
          <ProductCreationProgress
            copywritingCount={creationCenterData.copywriting.length}
            imageEditCount={creationCenterData.imageEdits.length}
            sceneImageCount={creationCenterData.sceneImages.length}
          />
        </div>
      ) : null}

      <div className="product-platform-selector" aria-label="目标平台">
        <div className="product-creation-section-header">
          <div>
            <strong>目标平台</strong>
            <span>用于后续模板适配</span>
          </div>
        </div>
        <div>
          {platformOptions.map((option) => (
            <button
              className={platform === option ? "active" : undefined}
              key={option}
              onClick={() => setPlatform(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="product-workspace-future-feature" aria-disabled="true">
        <div>
          <strong>详情页生成</strong>
          <span>预留能力</span>
        </div>
        <p>后续可基于当前分析、文案和图片素材生成完整商品详情页。本阶段仅展示入口，不接入生成流程。</p>
        <button disabled type="button">
          即将支持
        </button>
      </div>

      <button className="button primary" disabled={!uploadedAsset || isUploading || isAnalyzing || isRestoring} type="button" onClick={onAnalyze}>
        {isAnalyzing ? <AiThinkingLoading size="sm" /> : isPrimaryActionLoading ? <LoadingIndicator /> : null}
        {isUploading ? "正在上传..." : isAnalyzing ? "正在分析..." : isRestoring ? "正在恢复..." : analyzeLabel}
      </button>

      <p className="image-generation-helper">当前平台选择仅影响工作台展示，暂不改变生成提示词。</p>
      {error ? <p className="image-generation-error">{error}</p> : null}
    </aside>
  );
}
