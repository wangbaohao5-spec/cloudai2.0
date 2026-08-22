"use client";

import { ProductAnalysisResult } from "@/components/products/product-analysis-result";
import { ProductAssetGallery } from "@/components/products/product-asset-gallery";
import { ProductContentPackage } from "@/components/products/product-content-package";
import { ProductCopywritingPanel } from "@/components/products/product-copywriting-panel";
import { ProductGenerationBriefEditor } from "@/components/products/product-generation-brief";
import { ProductImageEditPanel } from "@/components/products/product-image-edit-panel";
import { ProductImageSetPanel } from "@/components/products/product-image-set-panel";
import { ProductOutputSettingsEditor } from "@/components/products/product-output-settings";
import { ProductWorkspaceEmptyState } from "@/components/products/product-workspace-empty-state";
import { DEFAULT_PRODUCT_OUTPUT_SETTINGS } from "@/lib/product-output-settings";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { ProductAnalysisResponse, ProductGenerationBrief, ProductOutputSettings } from "@/lib/product-types";
import Link from "next/link";
import { useEffect, useState } from "react";
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

type TabId = "analysis" | "assets" | "copywriting" | "export" | "imageSet" | "images";
type RemovedTabId = "detail-page" | "detailPage" | "scene" | "scenes";
type TabQueryValue = "analysis" | "assets" | "copywriting" | "export" | "image" | "image-set" | "imageSet" | "images";
type WorkspaceTabQuery = "analysis" | "assets" | "copywriting" | "export" | "image" | "image-set";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "analysis", label: "商品策划" },
  { id: "assets", label: "素材库" },
  { id: "copywriting", label: "上架文案" },
  { id: "images", label: "原图优化" },
  { id: "imageSet", label: "商品套图" },
  { id: "export", label: "素材包" },
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
        description="CloudAI 正在刷新当前商品项目，请稍等片刻。"
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
        actions={[{ label: "回到商品策划", onClick: () => onTabChange("analysis") }]}
      />
    );
  }

  if (!creationCenterData) {
    return (
      <ProductWorkspaceEmptyState
        eyebrow="尚未开始"
        marker="01"
        title="上传并分析商品后开始创作"
        description="完成商品分析后，素材库、上架文案、原图优化、商品套图和素材包会在这里统一管理。"
        actions={[{ label: "回到商品策划", onClick: () => onTabChange("analysis") }]}
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

function normalizeTabQuery(value: string | null): TabId {
  const tabMap: Partial<Record<TabQueryValue, TabId>> = {
    analysis: "analysis",
    assets: "assets",
    copywriting: "copywriting",
    export: "export",
    image: "images",
    imageSet: "imageSet",
    images: "images",
    "image-set": "imageSet",
  };

  return tabMap[value as TabQueryValue] || "analysis";
}

function getDetailPageHref(analysisHistoryId?: string) {
  return analysisHistoryId ? `/dashboard/detail-page?analysis=${encodeURIComponent(analysisHistoryId)}` : "/dashboard/detail-page";
}

function getWorkspaceTabQuery(tabId: TabId): WorkspaceTabQuery {
  const tabMap: Record<TabId, WorkspaceTabQuery> = {
    analysis: "analysis",
    assets: "assets",
    copywriting: "copywriting",
    export: "export",
    images: "image",
    imageSet: "image-set",
  };

  return tabMap[tabId];
}

function replaceWorkspaceTabUrl(analysisHistoryId: string | undefined, tabId: TabId) {
  const url = new URL(window.location.href);

  if (analysisHistoryId) {
    url.searchParams.set("analysis", analysisHistoryId);
  }

  url.searchParams.set("tab", getWorkspaceTabQuery(tabId));
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function ProductWorkspaceActionStrip({
  actions,
  description,
  title,
}: {
  actions: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="product-workspace-action-strip cai-delivery-card">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="product-workspace-action-strip-actions">{actions}</div>
    </section>
  );
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
  const [outputSettings, setOutputSettings] = useState<ProductOutputSettings>(DEFAULT_PRODUCT_OUTPUT_SETTINGS);
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
    imageSet: imageSetCount,
    export: creationCenterData ? 1 : 0,
  };
  const exportChecklist = [
    { label: "商品策划", done: Boolean(creationCenterData) },
    { label: "上架文案", done: copywritingCount > 0 },
    { label: "原图优化", done: imageEditCount > 0 },
    { label: "商品套图", done: imageSetCount > 0 },
  ];
  const isExportReady = Boolean(creationCenterData) && (copywritingCount > 0 || generatedAssetCount > 0);
  const uploadEmptyAction = isUploading
    ? { disabled: true, label: "上传图片中...", onClick: scrollToUploadSection, tone: "primary" as const }
    : { label: "请先上传商品图片", onClick: scrollToUploadSection, tone: "primary" as const };
  const analysisHistoryId = result?.historyId || creationCenterData?.product.analysisHistoryId;

  useEffect(() => {
    const nextTab = normalizeTabQuery(new URLSearchParams(window.location.search).get("tab"));

    setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
  }, []);

  useEffect(() => {
    function handlePopState() {
      const nextTab = normalizeTabQuery(new URLSearchParams(window.location.search).get("tab"));

      setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function normalizeTab(tabId: TabId | RemovedTabId): TabId {
    return tabs.some((tab) => tab.id === tabId) ? (tabId as TabId) : "analysis";
  }

  function switchTab(tabId: TabId | RemovedTabId) {
    const nextTab = normalizeTab(tabId);

    setActiveTab(nextTab);
    replaceWorkspaceTabUrl(analysisHistoryId, nextTab);
  }

  function switchTabAndFocus(tabId: TabId | RemovedTabId, panelId: string) {
    const nextTab = normalizeTab(tabId);

    setActiveTab(nextTab);
    replaceWorkspaceTabUrl(analysisHistoryId, nextTab);
    scrollToPanel(nextTab === tabId ? panelId : `product-workspace-panel-${nextTab}`);
  }

  function openRiskConfirmations() {
    setActiveTab("analysis");
    window.setTimeout(() => {
      document.getElementById("product-risk-confirmations")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <section className="product-workspace-main">
      <div className="product-workspace-tabs" role="tablist" aria-label="当前商品项目分区">
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
              { label: "生成商品套图和素材包", done: false },
            ]}
            actions={[uploadEmptyAction]}
          />
        ) : null}
        {uploadedAsset && !result ? (
          <ProductWorkspaceEmptyState
            eyebrow="下一步"
            marker="02"
            title="商品图已上传，下一步进行 AI 分析"
          description="AI 会识别商品类型、颜色、材质、卖点和需要保留的细节，为后续上架文案、视觉素材和商品套图做准备。"
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
            <ProductOutputSettingsEditor analysisHistoryId={result.historyId} onSettingsChange={setOutputSettings} />
            <ProductAnalysisResult analysis={result.analysis} defaultShowFullAnalysis showEnhancedFields showFullAnalysisToggle={false} title={result.title} />
            {result.historyId ? (
              <ProductWorkspaceActionStrip
                title="下一步创作"
                description="商品分析已完成。先确认生成要求和发布目标，再选择要制作的商品内容。"
                actions={
                  <>
                    <button className="button secondary" type="button" onClick={() => switchTabAndFocus("copywriting", "product-copywriting-panel")}>
                      生成上架文案
                    </button>
                    <button className="button secondary" type="button" onClick={() => switchTabAndFocus("images", "product-image-edit-panel")}>
                      优化商品原图
                    </button>
                    <button className="button primary" type="button" onClick={() => switchTabAndFocus("imageSet", "product-workspace-panel-imageSet")}>
                      生成商品套图
                    </button>
                    <Link className="button secondary" href={getDetailPageHref(result.historyId)}>
                      制作详情页
                    </Link>
                  </>
                }
              />
            ) : null}
            <section className="product-detail-page-entry-card">
              <div>
                <strong>详情页制作已独立</strong>
                <p>详情页素材会在独立页面制作，完成后仍会回到当前商品的素材库和素材包中汇总。</p>
              </div>
              {result.historyId ? (
                <Link className="button secondary" href={getDetailPageHref(result.historyId)}>
                  前往详情页制作
                </Link>
              ) : (
                <button className="button secondary" disabled type="button">
                  等待商品分析
                </button>
              )}
            </section>
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
              <ProductWorkspaceActionStrip
                title={generatedAssetCount ? "商品素材已准备" : "暂无生成素材"}
                description={
                  generatedAssetCount
                    ? "你可以下载单张图片，或导出完整商品素材包。"
                    : "你可以先生成上架文案、原图优化，或生成商品套图。"
                }
                actions={
                  generatedAssetCount ? (
                    <>
                      <button className="button primary" type="button" onClick={() => switchTab("export")}>
                        导出素材包
                      </button>
                      <button className="button secondary" type="button" onClick={() => switchTabAndFocus("imageSet", "product-workspace-panel-imageSet")}>
                        继续生成套图
                      </button>
                      <Link className="button secondary" href={getDetailPageHref(data.product.analysisHistoryId)}>
                        制作详情页
                      </Link>
                    </>
                  ) : (
                    <>
                      <button className="button primary" type="button" onClick={() => switchTabAndFocus("imageSet", "product-workspace-panel-imageSet")}>
                        去生成套图
                      </button>
                      <button className="button secondary" type="button" onClick={() => switchTabAndFocus("images", "product-image-edit-panel")}>
                        去原图优化
                      </button>
                      <button className="button secondary" type="button" onClick={() => switchTabAndFocus("copywriting", "product-copywriting-panel")}>
                        去上架文案
                      </button>
                    </>
                  )
                }
              />
              {!generatedAssetCount ? (
                <ProductWorkspaceEmptyState
                  eyebrow="素材汇总"
                  marker={hasOriginalAsset ? "IMG" : "00"}
                  title={hasOriginalAsset ? "素材会自动汇总到这里" : "还没有素材"}
                  description={
                    hasOriginalAsset
                      ? "生成的优化图、历史场景图、历史详情页图和商品套图都会自动进入素材库，方便预览和下载。"
                      : "生成上架文案、图片或商品套图后，素材会汇总在这里。"
                  }
                />
              ) : null}
              <ProductAssetGallery
                analysisHistoryId={data.product.analysisHistoryId}
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
            eyebrow="上架文案"
            marker="TXT"
            title="生成上架文案"
            description="根据商品分析和生成要求，生成标题、卖点、描述和平台文案。建议先在「商品策划」确认商品卖点与风险确认区。"
            actions={[{ label: "开始生成上架文案", onClick: () => scrollToPanel("product-copywriting-panel"), tone: "primary" }]}
          />
        ) : null}
        <ProductCopywritingPanel
          analysisResult={result}
          outputSettings={outputSettings}
          onGenerated={onGenerated}
          onOpenRiskConfirmations={openRiskConfirmations}
        />
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
            eyebrow="原图优化"
            marker="IMG"
            title="生成商品优化图"
            description="基于当前商品分析和原商品图，生成更适合电商展示的优化图片。生成结果会自动进入素材库。"
            actions={[
              { label: "优化商品原图", onClick: () => scrollToPanel("product-image-edit-panel"), tone: "primary" },
              { label: "查看素材库", onClick: () => switchTab("assets") },
            ]}
          />
        ) : null}
        <ProductImageEditPanel analysisResult={result} outputSettings={outputSettings} onGenerated={onGenerated} />
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
          outputSettings={outputSettings}
          onGenerated={onGenerated}
          onOpenRiskConfirmations={openRiskConfirmations}
          onViewAssets={() => switchTabAndFocus("assets", "product-asset-section-image-set")}
          onViewExport={() => switchTabAndFocus("export", "product-workspace-panel-export")}
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
          {(data) => {
            const hasCorePackage = copywritingCount > 0 && imageSetCount > 0;

            return (
              <>
                <ProductWorkspaceActionStrip
                  title={hasCorePackage ? "素材包可导出" : "素材还不完整"}
                  description={
                    hasCorePackage
                      ? "当前商品已包含上架文案和商品套图素材，可复制或下载 Markdown 素材包。"
                      : "你可以先生成商品套图或详情页素材，再导出更完整的商品包。"
                  }
                  actions={
                    hasCorePackage ? (
                      <>
                        <button className="button secondary" type="button" onClick={() => switchTab("assets")}>
                          查看素材库
                        </button>
                        <button className="button secondary" type="button" onClick={() => switchTabAndFocus("imageSet", "product-workspace-panel-imageSet")}>
                          继续生成套图
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="button primary" type="button" onClick={() => switchTabAndFocus("imageSet", "product-workspace-panel-imageSet")}>
                          去生成套图
                        </button>
                        <Link className="button secondary" href={getDetailPageHref(data.product.analysisHistoryId)}>
                          去详情页制作
                        </Link>
                        <button className="button secondary" type="button" onClick={() => switchTab("assets")}>
                          查看素材库
                        </button>
                      </>
                    )
                  }
                />
                {isExportReady ? (
                  <ProductContentPackage data={data} />
                ) : (
                  <ProductWorkspaceEmptyState
                    eyebrow="导出准备"
                    marker="MD"
                title="生成内容会整理成素材包"
                description="当上架文案、图片和商品套图生成后，可在这里复制或下载商品素材包 Markdown。建议先完成上架文案和至少一组视觉素材。"
                    checklist={exportChecklist}
                    actions={[
                      { label: "前往上架文案", onClick: () => switchTab("copywriting"), tone: "primary" },
                      { label: "前往原图优化", onClick: () => switchTabAndFocus("images", "product-image-edit-panel") },
                      { label: "前往商品套图", onClick: () => switchTabAndFocus("imageSet", "product-workspace-panel-imageSet") },
                    ]}
                  />
                )}
              </>
            );
          }}
        </CreationCenterState>
      </div>
    </section>
  );
}
