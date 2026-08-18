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
  onProductHintChange: (value: string) => void;
  productHint: string;
  result: ProductAnalysisResponse | null;
  uploadedAsset: UploadedAsset | null;
};

const platformOptions = ["通用", "Amazon", "Shopee", "TikTok Shop"];

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
  onProductHintChange,
  productHint,
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

      <section className="product-workspace-summary" id="product-upload-section" aria-label="当前商品摘要">
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
          <details className="product-upload-tips">
            <summary>上传建议</summary>
            <ul>
              <li>商品主体完整，光线清楚</li>
              <li>尽量正向拍摄，避免严重倾斜</li>
              <li>避免遮挡、强反光、过暗</li>
              <li>服装类建议正向或上身清晰</li>
            </ul>
          </details>
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

      <section className="product-workspace-supplement" aria-label="商品补充信息">
        <label htmlFor="product-supplement">
          商品补充信息（可选）
          <span>补充型号、规格、颜色、材质、卖点，或告诉 AI 哪些细节必须保留。</span>
        </label>
        <textarea
          id="product-supplement"
          maxLength={1000}
          placeholder="例如：这是一款粉蓝配色机械键盘，粉色背光，右下角卡通图案是键盘设计的一部分，请保留键盘整体布局、粉蓝配色、粉色灯光和卡通图案位置，不要把卡通人物改成漂浮装饰。主打可爱桌搭和柔和氛围感。"
          rows={4}
          value={productHint}
          onChange={(event) => onProductHintChange(event.target.value)}
        />
        <em>{productHint.trim().length ? `${productHint.trim().length}/1000` : "不填写也可以直接分析"}</em>
      </section>

      <div className="product-workspace-status" aria-live="polite">
        <div>
          <span>当前状态</span>
          <p>{status.description}</p>
        </div>
        <strong>{status.label}</strong>
      </div>

      <section className="product-quota-summary" aria-label="图片额度状态">
        <div>
          <span>图片额度</span>
          <strong>内测额度</strong>
        </div>
        <p>当前为内测版本，图片额度以额度中心实际记录为准。生成入口会提示预计消耗。</p>
      </section>

      <section className="product-workflow-mini-steps is-compact" aria-label="推荐生成流程">
        <strong>流程</strong>
        <div>
          {["上传", "分析", "生成要求", "套图", "素材库", "导出"].map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </section>

      {creationCenterData ? (
        <div className="product-workspace-progress-wrap">
          <ProductCreationProgress
            copywritingCount={creationCenterData.copywriting.length}
            detailPageCount={creationCenterData.detailPages.length}
            imageEditCount={creationCenterData.imageEdits.length}
            imageSetCount={creationCenterData.imageSetImages.length}
            sceneImageCount={creationCenterData.sceneImages.length}
          />
        </div>
      ) : null}

      <details className="product-workspace-secondary-settings">
        <summary>更多设置</summary>
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
            <strong>详情页素材</strong>
            <span>次级入口</span>
          </div>
          <p>详情页图片可在右侧「详情页」Tab 中按规划逐张生成，本区只保留轻量提示。</p>
          <button disabled type="button">
            右侧使用
          </button>
        </div>
      </details>

      <button className="button primary" disabled={!uploadedAsset || isUploading || isAnalyzing || isRestoring} type="button" onClick={onAnalyze}>
        {isAnalyzing ? <AiThinkingLoading size="sm" /> : isPrimaryActionLoading ? <LoadingIndicator /> : null}
        {isUploading ? "正在上传..." : isAnalyzing ? "正在分析..." : isRestoring ? "正在恢复..." : analyzeLabel}
      </button>

      <p className="image-generation-helper">当前平台选择仅影响工作台展示，暂不改变生成提示词。</p>
      {error ? <p className="image-generation-error">{error}</p> : null}
    </aside>
  );
}
