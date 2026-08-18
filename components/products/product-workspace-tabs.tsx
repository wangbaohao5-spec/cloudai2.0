"use client";

import { ProductAnalysisResult } from "@/components/products/product-analysis-result";
import { ProductAssetGallery } from "@/components/products/product-asset-gallery";
import { ProductContentPackage } from "@/components/products/product-content-package";
import { ProductCopywritingPanel } from "@/components/products/product-copywriting-panel";
import { ProductDetailPagePanel } from "@/components/products/product-detail-page-panel";
import { ProductGenerationBriefEditor } from "@/components/products/product-generation-brief";
import { ProductImageEditPanel } from "@/components/products/product-image-edit-panel";
import { ProductImageSetPanel } from "@/components/products/product-image-set-panel";
import { ProductSceneImagePanel } from "@/components/products/product-scene-image-panel";
import { ProductWorkspaceEmptyState } from "@/components/products/product-workspace-empty-state";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { ProductAnalysisResponse, ProductGenerationBrief } from "@/lib/product-types";
import { useState } from "react";
import type { ReactNode } from "react";

type ProductWorkspaceTabsProps = {
  creationCenterData: ProductCreationCenterData | null;
  creationCenterError: string;
  isAnalyzing: boolean;
  isCreationCenterLoading: boolean;
  isUploading: boolean;
  onAnalyze: () => void;
  onGenerated: () => void;
  result: ProductAnalysisResponse | null;
  uploadedAsset: UploadedAsset | null;
};

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

type TabId = "analysis" | "assets" | "copywriting" | "detailPage" | "export" | "imageSet" | "images" | "scenes";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "analysis", label: "分析" },
  { id: "assets", label: "素材" },
  { id: "copywriting", label: "文案" },
  { id: "images", label: "图片" },
  { id: "scenes", label: "场景" },
  { id: "detailPage", label: "详情页" },
  { id: "imageSet", label: "套图" },
  { id: "export", label: "导出" },
];

function CreationCenterState({
  children,
  creationCenterData,
  creationCenterError,
  isCreationCenterLoading,
  onTabChange,
}: {
  children: (data: ProductCreationCenterData) => ReactNode;
  creationCenterData: ProductCreationCenterData | null;
  creationCenterError: string;
  isCreationCenterLoading: boolean;
  onTabChange: (tabId: TabId) => void;
}) {
  if (isCreationCenterLoading) {
    return (
      <ProductWorkspaceEmptyState
        eyebrow="正在同步"
        marker="..."
        title="正在加载商品素材"
        description="CloudAI 正在刷新当前商品工作台，请稍等片刻。"
      />
    );
  }

  if (creationCenterError) {
    return (
      <ProductWorkspaceEmptyState
        eyebrow="数据暂不可用"
        marker="!"
        title="工作台数据暂不可用"
        description={creationCenterError}
        actions={[{ label: "回到分析", onClick: () => onTabChange("analysis") }]}
      />
    );
  }

  if (!creationCenterData) {
    return (
      <ProductWorkspaceEmptyState
        eyebrow="尚未开始"
        marker="01"
        title="上传并分析商品后开始创作"
        description="完成商品分析后，素材、文案、图片、场景图和导出内容会在这里统一管理。"
        actions={[{ label: "回到分析", onClick: () => onTabChange("analysis") }]}
      />
    );
  }

  return <>{children(creationCenterData)}</>;
}

function scrollToPanel(panelId: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(panelId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function scrollToUploadSection() {
  scrollToPanel("product-upload-section");
}

export function ProductWorkspaceTabs({
  creationCenterData,
  creationCenterError,
  isAnalyzing,
  isCreationCenterLoading,
  isUploading,
  onAnalyze,
  onGenerated,
  result,
  uploadedAsset,
}: ProductWorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("analysis");
  const [generationBrief, setGenerationBrief] = useState<ProductGenerationBrief | null>(null);
  const copywritingCount = creationCenterData?.copywriting.length || 0;
  const detailPageCount = creationCenterData?.detailPages.length || 0;
  const imageEditCount = creationCenterData?.imageEdits.length || 0;
  const imageSetCount = creationCenterData?.imageSetImages.length || 0;
  const sceneImageCount = creationCenterData?.sceneImages.length || 0;
  const hasOriginalAsset = Boolean(creationCenterData?.originalAsset);
  const generatedAssetCount = imageEditCount + sceneImageCount + detailPageCount + imageSetCount;
  const tabCounts: Partial<Record<TabId, number>> = {
    analysis: result ? 1 : 0,
    assets: creationCenterData ? Number(hasOriginalAsset) + generatedAssetCount : 0,
    copywriting: copywritingCount,
    images: imageEditCount,
    scenes: sceneImageCount,
    detailPage: detailPageCount,
    imageSet: imageSetCount,
    export: creationCenterData ? 1 : 0,
  };
  const exportChecklist = [
    { label: "分析", done: Boolean(creationCenterData) },
    { label: "文案", done: copywritingCount > 0 },
    { label: "图片", done: imageEditCount > 0 },
    { label: "场景", done: sceneImageCount > 0 },
  ];
  const isExportReady = exportChecklist.every((item) => item.done);
  const uploadEmptyAction = isUploading
    ? { disabled: true, label: "上传图片中...", onClick: scrollToUploadSection, tone: "primary" as const }
    : { label: "请先在左侧上传商品图片", onClick: scrollToUploadSection, tone: "primary" as const };

  function switchTab(tabId: TabId) {
    setActiveTab(tabId);
  }

  function switchTabAndFocus(tabId: TabId, panelId: string) {
    setActiveTab(tabId);
    scrollToPanel(panelId);
  }

  function openRiskConfirmations() {
    setActiveTab("analysis");
    window.setTimeout(() => {
      document.getElementById("product-risk-confirmations")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <section className="product-workspace-main">
      <div className="product-workspace-tabs" role="tablist" aria-label="商品工作台分区">
        {tabs.map((tab) => (
          <button
            aria-controls={`product-workspace-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={`product-workspace-tab ${activeTab === tab.id ? "active" : ""}`}
            id={`product-workspace-tab-${tab.id}`}
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            role="tab"
            type="button"
          >
            <span>{tab.label}</span>
            {tabCounts[tab.id] ? <em>{tabCounts[tab.id]}</em> : null}
          </button>
        ))}
      </div>

      <div
        aria-labelledby="product-workspace-tab-analysis"
        className="product-workspace-panel"
        hidden={activeTab !== "analysis"}
        id="product-workspace-panel-analysis"
        role="tabpanel"
      >
        {!uploadedAsset && !result ? (
          <ProductWorkspaceEmptyState
            eyebrow="开始创建"
            marker="01"
            title="从一张商品图开始"
            description="上传商品原图后，CloudAI 会先分析商品信息，再帮你生成文案、可用视觉素材、商品套图和素材库。"
            checklist={[
              { label: "上传清晰商品图", done: false },
              { label: "补充卖点或必须保留的细节", done: false },
              { label: "生成套图和素材包", done: false },
            ]}
            actions={[uploadEmptyAction]}
          />
        ) : null}
        {uploadedAsset && !result ? (
          <ProductWorkspaceEmptyState
            eyebrow="下一步"
            marker="02"
            title="商品图已上传，下一步进行 AI 分析"
            description="AI 会识别商品类型、颜色、材质、卖点和需要保留的细节，为后续文案、视觉素材和套图生成做准备。"
            checklist={[
              { label: "商品图已上传", done: true },
              { label: "等待 AI 分析", done: false },
              { label: "生成素材前先确认商品信息", done: false },
            ]}
            actions={[{ disabled: isAnalyzing || isUploading, label: isAnalyzing ? "分析中..." : isUploading ? "上传图片中..." : "分析商品", onClick: onAnalyze, tone: "primary" }]}
          />
        ) : null}
        {result ? (
          <>
            <ProductGenerationBriefEditor analysis={result.analysis} analysisHistoryId={result.historyId} onBriefChange={setGenerationBrief} />
            <ProductAnalysisResult analysis={result.analysis} defaultShowFullAnalysis showEnhancedFields showFullAnalysisToggle={false} title={result.title} />
          </>
        ) : null}
      </div>

      <div
        aria-labelledby="product-workspace-tab-assets"
        className="product-workspace-panel"
        hidden={activeTab !== "assets"}
        id="product-workspace-panel-assets"
        role="tabpanel"
      >
        <CreationCenterState
          creationCenterData={creationCenterData}
          creationCenterError={creationCenterError}
          isCreationCenterLoading={isCreationCenterLoading}
          onTabChange={switchTab}
        >
          {(data) => (
            <>
              {!generatedAssetCount ? (
                <ProductWorkspaceEmptyState
                  eyebrow="素材汇总"
                  marker={hasOriginalAsset ? "IMG" : "00"}
                  title={hasOriginalAsset ? "素材会自动汇总到这里" : "还没有素材"}
                  description={
                    hasOriginalAsset
                      ? "生成的优化图、场景图、详情页图和商品套图都会自动进入素材库，方便预览和下载。可先前往「套图」Tab 生成一套商品素材。"
                      : "生成文案、图片或场景图后，素材会汇总在这里。"
                  }
                  actions={[
                    { label: "前往套图", onClick: () => switchTabAndFocus("imageSet", "product-workspace-panel-imageSet"), tone: "primary" },
                    { label: "详情页素材", onClick: () => switchTabAndFocus("detailPage", "product-workspace-panel-detailPage") },
                    { label: "前往图片", onClick: () => switchTabAndFocus("images", "product-image-edit-panel") },
                  ]}
                />
              ) : null}
              <ProductAssetGallery
                detailPages={data.detailPages}
                imageSetImages={data.imageSetImages}
                originalAsset={data.originalAsset}
                imageEdits={data.imageEdits}
                sceneImages={data.sceneImages}
              />
            </>
          )}
        </CreationCenterState>
      </div>

      <div
        aria-labelledby="product-workspace-tab-copywriting"
        className="product-workspace-panel"
        hidden={activeTab !== "copywriting"}
        id="product-workspace-panel-copywriting"
        role="tabpanel"
      >
        {result && !copywritingCount ? (
          <ProductWorkspaceEmptyState
            eyebrow="文案生成"
            marker="TXT"
            title="生成商品文案"
            description="根据商品分析和生成要求，生成标题、卖点、描述和平台文案。建议先在分析 Tab 确认商品卖点与风险确认区。"
            actions={[{ label: "开始生成文案", onClick: () => scrollToPanel("product-copywriting-panel"), tone: "primary" }]}
          />
        ) : null}
        <ProductCopywritingPanel analysisResult={result} onGenerated={onGenerated} onOpenRiskConfirmations={openRiskConfirmations} />
      </div>

      <div
        aria-labelledby="product-workspace-tab-images"
        className="product-workspace-panel"
        hidden={activeTab !== "images"}
        id="product-workspace-panel-images"
        role="tabpanel"
      >
        {result && !imageEditCount ? (
          <ProductWorkspaceEmptyState
            eyebrow="图片素材"
            marker="IMG"
            title="生成商品优化图"
            description="基于当前商品分析和原商品图，生成更适合电商展示的优化图片。生成结果会自动进入素材库。"
            actions={[
              { label: "优化商品原图", onClick: () => scrollToPanel("product-image-edit-panel"), tone: "primary" },
              { label: "查看素材", onClick: () => switchTab("assets") },
            ]}
          />
        ) : null}
        <ProductImageEditPanel analysisResult={result} onGenerated={onGenerated} />
      </div>

      <div
        aria-labelledby="product-workspace-tab-scenes"
        className="product-workspace-panel"
        hidden={activeTab !== "scenes"}
        id="product-workspace-panel-scenes"
        role="tabpanel"
      >
        {result && !sceneImageCount ? (
          <ProductWorkspaceEmptyState
            eyebrow="场景图"
            marker="SCN"
            title="生成营销场景图"
            description="选择使用场景、平台和视觉风格，生成适合详情页、社媒或广告使用的商品场景图。"
            actions={[{ label: "开始生成场景图", onClick: () => scrollToPanel("product-scene-image-panel"), tone: "primary" }]}
          />
        ) : null}
        <ProductSceneImagePanel analysisResult={result} generationBrief={generationBrief} onGenerated={onGenerated} />
      </div>

      <div
        aria-labelledby="product-workspace-tab-detailPage"
        className="product-workspace-panel"
        hidden={activeTab !== "detailPage"}
        id="product-workspace-panel-detailPage"
        role="tabpanel"
      >
        {result && !detailPageCount ? (
          <ProductWorkspaceEmptyState
            eyebrow="详情页"
            marker="DTP"
            title="生成详情页素材"
            description="可先规划详情页图片结构，再按需逐张生成卖点、细节、场景或购买理由素材。"
            actions={[{ label: "配置详情页素材", onClick: () => scrollToPanel("product-workspace-panel-detailPage"), tone: "primary" }]}
          />
        ) : null}
        <ProductDetailPagePanel analysisResult={result} generationBrief={generationBrief} onGenerated={onGenerated} onOpenRiskConfirmations={openRiskConfirmations} />
      </div>

      <div
        aria-labelledby="product-workspace-tab-imageSet"
        className="product-workspace-panel"
        hidden={activeTab !== "imageSet"}
        id="product-workspace-panel-imageSet"
        role="tabpanel"
      >
        {result && !imageSetCount ? (
          <ProductWorkspaceEmptyState
            eyebrow="商品套图"
            marker="SET"
            title="生成商品套图"
            description="选择用途和张数，先规划每张图的任务，再一键生成整套。适合快速上架、详情页、社媒种草和平台 Listing。"
            actions={[{ label: "配置套图规划", onClick: () => scrollToPanel("product-workspace-panel-imageSet"), tone: "primary" }]}
          />
        ) : null}
        <ProductImageSetPanel
          analysisResult={result}
          generationBrief={generationBrief}
          onGenerated={onGenerated}
          onOpenRiskConfirmations={openRiskConfirmations}
          onViewAssets={() => switchTabAndFocus("assets", "product-workspace-panel-assets")}
        />
      </div>

      <div
        aria-labelledby="product-workspace-tab-export"
        className="product-workspace-panel"
        hidden={activeTab !== "export"}
        id="product-workspace-panel-export"
        role="tabpanel"
      >
        <CreationCenterState
          creationCenterData={creationCenterData}
          creationCenterError={creationCenterError}
          isCreationCenterLoading={isCreationCenterLoading}
          onTabChange={switchTab}
        >
          {(data) =>
            isExportReady ? (
              <ProductContentPackage data={data} />
            ) : (
              <ProductWorkspaceEmptyState
                eyebrow="导出准备"
                marker="MD"
                title="生成内容会整理成素材包"
                description="当文案、图片和套图生成后，可在这里复制或下载商品素材包 Markdown。建议先完成文案和至少一组视觉素材。"
                checklist={exportChecklist}
                actions={[
                  { label: "前往文案", onClick: () => switchTab("copywriting"), tone: "primary" },
                  { label: "前往图片", onClick: () => switchTabAndFocus("images", "product-image-edit-panel") },
                  { label: "前往场景", onClick: () => switchTabAndFocus("scenes", "product-scene-image-panel") },
                ]}
              />
            )
          }
        </CreationCenterState>
      </div>
    </section>
  );
}
