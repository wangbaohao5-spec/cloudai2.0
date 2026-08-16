"use client";

import { ProductAnalysisResult } from "@/components/products/product-analysis-result";
import { ProductAssetGallery } from "@/components/products/product-asset-gallery";
import { ProductContentPackage } from "@/components/products/product-content-package";
import { ProductCopywritingPanel } from "@/components/products/product-copywriting-panel";
import { ProductDetailPagePanel } from "@/components/products/product-detail-page-panel";
import { ProductGenerationBriefEditor } from "@/components/products/product-generation-brief";
import { ProductImageEditPanel } from "@/components/products/product-image-edit-panel";
import { ProductSceneImagePanel } from "@/components/products/product-scene-image-panel";
import { ProductWorkspaceEmptyState } from "@/components/products/product-workspace-empty-state";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { ProductAnalysisResponse, ProductGenerationBrief } from "@/lib/product-types";
import { useState } from "react";
import type { ReactNode } from "react";

type ProductWorkspaceTabsProps = {
  creationCenterData: ProductCreationCenterData | null;
  creationCenterError: string;
  isCreationCenterLoading: boolean;
  onGenerated: () => void;
  result: ProductAnalysisResponse | null;
};

type TabId = "analysis" | "assets" | "copywriting" | "detailPage" | "export" | "images" | "scenes";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "analysis", label: "分析" },
  { id: "assets", label: "素材" },
  { id: "copywriting", label: "文案" },
  { id: "images", label: "图片" },
  { id: "scenes", label: "场景" },
  { id: "detailPage", label: "详情页" },
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

export function ProductWorkspaceTabs({
  creationCenterData,
  creationCenterError,
  isCreationCenterLoading,
  onGenerated,
  result,
}: ProductWorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("analysis");
  const [generationBrief, setGenerationBrief] = useState<ProductGenerationBrief | null>(null);
  const copywritingCount = creationCenterData?.copywriting.length || 0;
  const detailPageCount = creationCenterData?.detailPages.length || 0;
  const imageEditCount = creationCenterData?.imageEdits.length || 0;
  const sceneImageCount = creationCenterData?.sceneImages.length || 0;
  const hasOriginalAsset = Boolean(creationCenterData?.originalAsset);
  const generatedAssetCount = imageEditCount + sceneImageCount + detailPageCount;
  const tabCounts: Partial<Record<TabId, number>> = {
    analysis: result ? 1 : 0,
    assets: creationCenterData ? Number(hasOriginalAsset) + generatedAssetCount : 0,
    copywriting: copywritingCount,
    images: imageEditCount,
    scenes: sceneImageCount,
    detailPage: detailPageCount,
    export: creationCenterData ? 1 : 0,
  };
  const exportChecklist = [
    { label: "分析", done: Boolean(creationCenterData) },
    { label: "文案", done: copywritingCount > 0 },
    { label: "图片", done: imageEditCount > 0 },
    { label: "场景", done: sceneImageCount > 0 },
  ];
  const isExportReady = exportChecklist.every((item) => item.done);

  function switchTab(tabId: TabId) {
    setActiveTab(tabId);
  }

  function switchTabAndFocus(tabId: TabId, panelId: string) {
    setActiveTab(tabId);
    scrollToPanel(panelId);
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
        <ProductAnalysisResult analysis={result?.analysis || null} defaultShowFullAnalysis showEnhancedFields showFullAnalysisToggle={false} title={result?.title} />
        <ProductGenerationBriefEditor analysis={result?.analysis || null} analysisHistoryId={result?.historyId} onBriefChange={setGenerationBrief} />
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
                  title={hasOriginalAsset ? "已收录原商品图" : "还没有素材"}
                  description={
                    hasOriginalAsset
                      ? "原商品图已进入素材区。继续生成图片优化结果或营销场景图后，这里会形成更完整的素材集合。"
                      : "生成文案、图片或场景图后，素材会汇总在这里。"
                  }
                  actions={[
                    { label: "前往图片", onClick: () => switchTabAndFocus("images", "product-image-edit-panel"), tone: "primary" },
                    { label: "前往场景", onClick: () => switchTabAndFocus("scenes", "product-scene-image-panel") },
                    { label: "前往文案", onClick: () => switchTab("copywriting") },
                  ]}
                />
              ) : null}
              <ProductAssetGallery detailPages={data.detailPages} originalAsset={data.originalAsset} imageEdits={data.imageEdits} sceneImages={data.sceneImages} />
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
        <ProductCopywritingPanel analysisResult={result} onGenerated={onGenerated} />
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
            title="还没有图片素材"
            description="基于当前商品分析，生成商品展示图或优化商品原图。"
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
            eyebrow="营销视觉"
            marker="SCN"
            title="还没有营销场景图"
            description="生成适合电商详情页、社媒或广告使用的商品场景图。"
            actions={[{ label: "生成场景图", onClick: () => scrollToPanel("product-scene-image-panel"), tone: "primary" }]}
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
        <ProductDetailPagePanel analysisResult={result} generationBrief={generationBrief} onGenerated={onGenerated} />
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
                title="素材包还不完整"
                description="建议先完成文案、图片和场景图，再导出完整 Markdown 素材包。"
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
