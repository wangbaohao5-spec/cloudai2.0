"use client";

import { ProductAnalysisResult } from "@/components/products/product-analysis-result";
import { ProductAssetGallery } from "@/components/products/product-asset-gallery";
import { ProductContentPackage } from "@/components/products/product-content-package";
import { ProductCopywritingPanel } from "@/components/products/product-copywriting-panel";
import { ProductImageEditPanel } from "@/components/products/product-image-edit-panel";
import { ProductSceneImagePanel } from "@/components/products/product-scene-image-panel";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useState } from "react";

type ProductWorkspaceTabsProps = {
  creationCenterData: ProductCreationCenterData | null;
  creationCenterError: string;
  isCreationCenterLoading: boolean;
  onGenerated: () => void;
  result: ProductAnalysisResponse | null;
};

type TabId = "analysis" | "assets" | "copywriting" | "images" | "scenes" | "export";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "analysis", label: "分析" },
  { id: "assets", label: "素材" },
  { id: "copywriting", label: "文案" },
  { id: "images", label: "图片" },
  { id: "scenes", label: "场景" },
  { id: "export", label: "导出" },
];

function ProductWorkspaceEmpty({ actionLabel, description, icon, title }: { actionLabel?: string; description: string; icon: string; title: string }) {
  return <EmptyState icon={icon} title={title} description={description} actionHref="/dashboard/products" actionLabel={actionLabel || "上传商品图"} />;
}

function CreationCenterState({
  children,
  creationCenterData,
  creationCenterError,
  isCreationCenterLoading,
  type,
}: {
  children: (data: ProductCreationCenterData) => React.ReactNode;
  creationCenterData: ProductCreationCenterData | null;
  creationCenterError: string;
  isCreationCenterLoading: boolean;
  type: "assets" | "export";
}) {
  if (isCreationCenterLoading) {
    return <ProductWorkspaceEmpty icon="⏳" title="正在加载商品素材" description="CloudAI 正在刷新当前商品工作台。" actionLabel="等待刷新" />;
  }

  if (creationCenterError) {
    return <ProductWorkspaceEmpty icon="!" title="工作台数据暂不可用" description={creationCenterError} actionLabel="重新进入工作台" />;
  }

  if (!creationCenterData) {
    return (
      <ProductWorkspaceEmpty
        icon={type === "assets" ? "🖼" : "📦"}
        title={type === "assets" ? "还没有素材" : "还没有可导出内容"}
        description="上传并分析商品后，即可在这里整理当前商品的素材。"
      />
    );
  }

  return <>{children(creationCenterData)}</>;
}

export function ProductWorkspaceTabs({
  creationCenterData,
  creationCenterError,
  isCreationCenterLoading,
  onGenerated,
  result,
}: ProductWorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("analysis");
  const tabCounts: Partial<Record<TabId, number>> = {
    analysis: result ? 1 : 0,
    assets: creationCenterData
      ? Number(Boolean(creationCenterData.originalAsset)) + creationCenterData.imageEdits.length + creationCenterData.sceneImages.length
      : 0,
    copywriting: creationCenterData?.copywriting.length || 0,
    images: creationCenterData?.imageEdits.length || 0,
    scenes: creationCenterData?.sceneImages.length || 0,
    export: creationCenterData ? 1 : 0,
  };

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
            onClick={() => setActiveTab(tab.id)}
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
        <ProductAnalysisResult analysis={result?.analysis || null} title={result?.title} />
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
          type="assets"
        >
          {(data) => <ProductAssetGallery originalAsset={data.originalAsset} imageEdits={data.imageEdits} sceneImages={data.sceneImages} />}
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
        <ProductImageEditPanel analysisResult={result} onGenerated={onGenerated} />
      </div>

      <div
        aria-labelledby="product-workspace-tab-scenes"
        className="product-workspace-panel"
        hidden={activeTab !== "scenes"}
        id="product-workspace-panel-scenes"
        role="tabpanel"
      >
        <ProductSceneImagePanel analysisResult={result} onGenerated={onGenerated} />
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
          type="export"
        >
          {(data) => <ProductContentPackage data={data} />}
        </CreationCenterState>
      </div>
    </section>
  );
}
