"use client";

import { ProductAnalysisResult } from "@/components/products/product-analysis-result";
import { ProductAssetGallery } from "@/components/products/product-asset-gallery";
import { ProductContentPackage } from "@/components/products/product-content-package";
import { ProductCopywritingPanel } from "@/components/products/product-copywriting-panel";
import { ProductImageEditPanel } from "@/components/products/product-image-edit-panel";
import { ProductSceneImagePanel } from "@/components/products/product-scene-image-panel";
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
  { id: "analysis", label: "Analysis" },
  { id: "assets", label: "Assets" },
  { id: "copywriting", label: "Copywriting" },
  { id: "images", label: "Images" },
  { id: "scenes", label: "Scenes" },
  { id: "export", label: "Export" },
];

function ProductWorkspaceEmpty({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="product-workspace-empty">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
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
    return <ProductWorkspaceEmpty title="Loading product materials">CloudAI is refreshing the current product workspace.</ProductWorkspaceEmpty>;
  }

  if (creationCenterError) {
    return <ProductWorkspaceEmpty title="Workspace data unavailable">{creationCenterError}</ProductWorkspaceEmpty>;
  }

  if (!creationCenterData) {
    return (
      <ProductWorkspaceEmpty title={type === "assets" ? "No assets yet" : "Nothing to export yet"}>
        Upload and analyze a product image before using this tab.
      </ProductWorkspaceEmpty>
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

  return (
    <section className="product-workspace-main">
      <div className="product-workspace-tabs" role="tablist" aria-label="Product workspace sections">
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
            {tab.label}
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
