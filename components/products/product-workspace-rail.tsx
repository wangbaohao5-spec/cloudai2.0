"use client";

import { ProductCreationProgress } from "@/components/products/product-creation-progress";
import { ProductCreationSummary } from "@/components/products/product-creation-summary";
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
    return "未上传";
  }

  if (!result) {
    return "已上传，待分析";
  }

  const generatedCount = creationCenterData
    ? creationCenterData.copywriting.length + creationCenterData.imageEdits.length + creationCenterData.sceneImages.length
    : 0;

  return generatedCount > 0 ? "已生成素材" : "已分析";
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

      <div className="product-workspace-status">
        <span>当前状态</span>
        <strong>{status}</strong>
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
          <strong>目标平台</strong>
          <span>用于后续模板适配</span>
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

      <button className="button primary" disabled={!uploadedAsset || isUploading || isAnalyzing || isRestoring} type="button" onClick={onAnalyze}>
        {isUploading ? "上传中..." : isAnalyzing ? "分析中..." : isRestoring ? "恢复中..." : analyzeLabel}
      </button>

      <p className="image-generation-helper">当前平台选择仅影响工作台展示，暂不改变生成提示词。</p>
      {error ? <p className="image-generation-error">{error}</p> : null}
    </aside>
  );
}
