"use client";

import {
  DetailPageExistingAssetPicker,
  DetailPageSectionCopyEditor,
} from "@/components/products/product-detail-page-plan-preview";
import {
  DETAIL_PAGE_MODULE_DEFINITIONS,
  canBindExistingAssetToModule,
  getDetailPageSectionCompletion,
  evaluateDetailPageReadiness,
  type DetailPageAssetCandidate,
  type DetailPageModuleType,
  type DetailPageProjectOperation,
  type DetailPageProjectV2,
} from "@/lib/detail-page-project";
import { getDetailPageSectionExportBlockers } from "@/lib/detail-page-export";
import {
  DETAIL_PAGE_LOGICAL_WIDTH,
  buildDetailPagePreview,
  getDetailPageMediaRole,
  getDetailPageLayoutVariants,
  getDetailPageStyleClass,
  getNextDetailPageLayout,
  type DetailPagePreviewSection,
} from "@/lib/detail-page-preview";

type ProductDetailPageContinuousPreviewProps = {
  candidates: DetailPageAssetCandidate[];
  generatingSectionId?: string;
  isLoadingAssets?: boolean;
  isUpdating?: boolean;
  downloadingExport?: "full" | string;
  onBackToBuild: () => void;
  onDownloadExport: (mode: "full" | "section", sectionId?: string) => void;
  onGenerateSection: (sectionId: string) => void;
  onOperation: (operation: DetailPageProjectOperation) => void;
  project: DetailPageProjectV2;
};

const PREVIEW_STATE_COPY = {
  planned: { title: "尚未制作", body: "返回制作步骤补充素材或生成模块视觉。" },
  "needs-input": { title: "需要补充资料", body: "补充可确认的商品资料后再完成此模块。" },
  failed: { title: "生成失败", body: "可返回制作步骤重试，已有素材不会被删除。" },
  generating: { title: "正在制作", body: "完成后会自动恢复到当前详情页项目。" },
} as const;

const LAYOUT_LABELS: Record<string, string> = {
  FULL_VISUAL: "全幅视觉",
  SPLIT: "图文分栏",
  TEXT_LED: "文案优先",
  SINGLE_DETAIL: "单图细节",
  SPLIT_DETAIL: "细节分栏",
  STEP_TEXT: "步骤文字",
  EDITORIAL_SPLIT: "编辑分栏",
  SIMPLE_FACTS: "简洁参数",
  TWO_COLUMN_FACTS: "双栏参数",
};

function PreviewImage({ item }: { item: DetailPagePreviewSection }) {
  if (item.missingPreview) {
    return (
      <div className="product-detail-preview-missing" role="status">
        <strong>素材暂不可预览</strong>
        <span>素材绑定已保留，可替换素材或返回制作步骤检查。</span>
      </div>
    );
  }

  const asset = item.asset;
  const displayUrl = asset?.displayUrl || asset?.previewUrl;
  if (!asset || !displayUrl) return null;

  const mediaRole = getDetailPageMediaRole(item.section.moduleType);

  return (
    // Existing asset candidates already provide short-lived, product-scoped preview URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`${DETAIL_PAGE_MODULE_DEFINITIONS[item.section.moduleType].label}：${asset.name}`}
      className={`product-detail-preview-media media-role-${mediaRole}`}
      data-media-role={mediaRole}
      decoding="async"
      loading={item.section.order === 1 ? "eager" : "lazy"}
      src={displayUrl}
    />
  );
}

function PreviewCopy({ item }: { item: DetailPagePreviewSection }) {
  const definition = DETAIL_PAGE_MODULE_DEFINITIONS[item.section.moduleType];

  return (
    <div className="product-detail-preview-copy">
      <p>{definition.label}</p>
      <div className="product-detail-preview-title">{item.section.copy.headline || definition.label}</div>
      {item.section.copy.body ? <div className="product-detail-preview-body">{item.section.copy.body}</div> : <span>{item.section.purpose}</span>}
    </div>
  );
}

function VisualSection({ item }: { item: DetailPagePreviewSection }) {
  return (
    <div className="product-detail-preview-visual-layout">
      <PreviewImage item={item} />
      <PreviewCopy item={item} />
    </div>
  );
}

function TextSection({ item }: { item: DetailPagePreviewSection }) {
  return (
    <div className="product-detail-preview-text-layout">
      <PreviewCopy item={item} />
      <PreviewImage item={item} />
    </div>
  );
}

function DetailSection({ item }: { item: DetailPagePreviewSection }) {
  return (
    <div className="product-detail-preview-detail-layout">
      <PreviewImage item={item} />
      <PreviewCopy item={item} />
    </div>
  );
}

const SECTION_RENDERERS: Record<DetailPageModuleType, (props: { item: DetailPagePreviewSection }) => React.ReactNode> = {
  HERO: VisualSection,
  BENEFITS: TextSection,
  USAGE_SCENE: VisualSection,
  PRODUCT_DETAIL: DetailSection,
  USAGE_GUIDE: TextSection,
  BRAND_CONTENT: VisualSection,
  SPECS: TextSection,
};

function PreviewPlaceholder({ item }: { item: DetailPagePreviewSection }) {
  if (item.state === "complete") return null;
  const copy = PREVIEW_STATE_COPY[item.state];

  return (
    <div className={`product-detail-preview-state is-${item.state}`} role="status">
      <span>{DETAIL_PAGE_MODULE_DEFINITIONS[item.section.moduleType].label}</span>
      <strong>{copy.title}</strong>
      <p>{copy.body}</p>
    </div>
  );
}

function SectionControls({
  candidates,
  disabled,
  index,
  isLoadingAssets,
  item,
  onBackToBuild,
  onDownloadExport,
  onGenerateSection,
  onOperation,
  total,
  downloadable,
  downloading,
}: {
  candidates: DetailPageAssetCandidate[];
  disabled: boolean;
  index: number;
  isLoadingAssets: boolean;
  item: DetailPagePreviewSection;
  onBackToBuild: () => void;
  onDownloadExport: (mode: "full" | "section", sectionId?: string) => void;
  onGenerateSection: (sectionId: string) => void;
  onOperation: (operation: DetailPageProjectOperation) => void;
  total: number;
  downloadable: boolean;
  downloading: boolean;
}) {
  const section = item.section;
  const variants = getDetailPageLayoutVariants(section.moduleType);
  const generationReadiness = evaluateDetailPageReadiness(section.moduleType, section.evidence, null);
  const canGenerate = canBindExistingAssetToModule(section.moduleType) && generationReadiness === "READY";

  return (
    <div className="product-detail-preview-controls" aria-label={`${DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType].label}模块操作`}>
      <div>
        <button className="cai-button cai-button--ghost cai-button--sm" disabled={disabled || index === 0} type="button" onClick={() => onOperation({ type: "move-section", sectionId: section.id, direction: "up" })}>上移</button>
        <button className="cai-button cai-button--ghost cai-button--sm" disabled={disabled || index === total - 1} type="button" onClick={() => onOperation({ type: "move-section", sectionId: section.id, direction: "down" })}>下移</button>
        {variants.length > 1 ? (
          <button className="cai-button cai-button--secondary cai-button--sm" disabled={disabled} type="button" onClick={() => onOperation({ type: "set-layout", sectionId: section.id, layout: getNextDetailPageLayout(section.moduleType, item.layout) })}>
            换个版式 · {LAYOUT_LABELS[item.layout]}
          </button>
        ) : null}
      </div>
      <div>
        <button className="cai-button cai-button--ghost cai-button--sm" disabled={disabled} type="button" onClick={() => onOperation({ type: "set-hidden", sectionId: section.id, hidden: true })}>隐藏</button>
        <button
          className="cai-button cai-button--ghost cai-button--sm"
          disabled={disabled || total <= 3}
          type="button"
          onClick={() => {
            if (window.confirm("从当前详情页中删除此模块？素材库、历史记录和存储对象不会被删除。")) {
              onOperation({ type: "delete-section", sectionId: section.id });
            }
          }}
        >
          删除
        </button>
      </div>

      <details>
        <summary>调整模块</summary>
        <div className="product-detail-preview-editor">
          <DetailPageSectionCopyEditor disabled={disabled} section={section} onSave={(headline, body) => onOperation({ type: "set-copy", sectionId: section.id, headline, body })} />
          <DetailPageExistingAssetPicker candidates={candidates} disabled={disabled} isLoading={isLoadingAssets} section={section} onOperation={onOperation} />
          <div className="product-detail-preview-generation-actions">
            <button className="cai-button cai-button--primary cai-button--sm" disabled={disabled || !downloadable || downloading} type="button" onClick={() => onDownloadExport("section", section.id)}>
              {downloading ? "正在生成切片…" : "下载此切片"}
            </button>
            <button className="cai-button cai-button--secondary cai-button--sm" disabled={disabled || !canGenerate} type="button" onClick={() => onGenerateSection(section.id)}>
              {section.selectedAssetId ? "重新生成" : "生成视觉"}
            </button>
            <button className="cai-button cai-button--ghost cai-button--sm" type="button" onClick={onBackToBuild}>返回制作</button>
          </div>
        </div>
      </details>
    </div>
  );
}

export function ProductDetailPageContinuousPreview({
  candidates,
  downloadingExport,
  generatingSectionId = "",
  isLoadingAssets = false,
  isUpdating = false,
  onBackToBuild,
  onDownloadExport,
  onGenerateSection,
  onOperation,
  project,
}: ProductDetailPageContinuousPreviewProps) {
  const preview = buildDetailPagePreview(project, candidates);
  const disabled = isUpdating || Boolean(generatingSectionId) || project.sections.some((section) => section.lifecycle === "GENERATING");
  const candidateIds = new Set(candidates.map((candidate) => candidate.assetId));
  const exportableSectionIds = new Set(preview.visible.filter((item) => {
    const completion = getDetailPageSectionCompletion(item.section, Boolean(item.section.selectedAssetId && candidateIds.has(item.section.selectedAssetId)));
    return completion.complete && !getDetailPageSectionExportBlockers(item.section).length;
  }).map((item) => item.section.id));
  const fullExportReady = preview.visible.length > 0 && exportableSectionIds.size === preview.visible.length && !disabled;

  return (
    <div className="product-detail-preview-workspace">
      <div className="product-detail-preview-heading">
        <div>
          <p>Continuous Preview · {DETAIL_PAGE_LOGICAL_WIDTH}px</p>
          <h3>连续详情页预览</h3>
          <span>{exportableSectionIds.size} / {preview.visible.length} 个可见模块已完成{fullExportReady ? " · Ready to export" : ""}</span>
        </div>
        <button className="cai-button cai-button--primary" disabled={!fullExportReady || Boolean(downloadingExport)} type="button" onClick={() => onDownloadExport("full")}>
          {downloadingExport === "full" ? "正在生成长图…" : "下载完整长图"}
        </button>
      </div>
      {!fullExportReady ? <p className="product-detail-preview-export-note">还有 {preview.visible.length - exportableSectionIds.size} 个模块需要完成后才能导出完整详情页。已完成模块仍可单独下载切片。</p> : null}

      {preview.hidden.length ? (
        <aside className="product-detail-preview-hidden" aria-label="已隐藏模块">
          <strong>已隐藏模块</strong>
          {preview.hidden.map((item) => (
            <button className="cai-button cai-button--ghost cai-button--sm" disabled={disabled} key={item.section.id} type="button" onClick={() => onOperation({ type: "set-hidden", sectionId: item.section.id, hidden: false })}>
              显示 {DETAIL_PAGE_MODULE_DEFINITIONS[item.section.moduleType].label}
            </button>
          ))}
        </aside>
      ) : null}

      <div className={`product-detail-preview-canvas ${getDetailPageStyleClass(project.pageStyle.preset)}`} style={{ "--detail-page-logical-width": `${DETAIL_PAGE_LOGICAL_WIDTH}px` } as React.CSSProperties}>
        {preview.visible.map((item, index) => {
          const Renderer = SECTION_RENDERERS[item.section.moduleType];
          return (
            <article className={`product-detail-preview-module is-${item.section.moduleType.toLowerCase().replace("_", "-")} layout-${item.layout.toLowerCase().replaceAll("_", "-")}`} key={item.section.id}>
              <SectionControls
                candidates={candidates}
                disabled={disabled}
                index={index}
                isLoadingAssets={isLoadingAssets}
                item={item}
                downloadable={exportableSectionIds.has(item.section.id)}
                downloading={downloadingExport === item.section.id}
                total={preview.visible.length}
                onBackToBuild={onBackToBuild}
                onDownloadExport={onDownloadExport}
                onGenerateSection={onGenerateSection}
                onOperation={onOperation}
              />
              <section aria-labelledby={`detail-page-preview-${item.section.id}`}>
                <h3 className="sr-only" id={`detail-page-preview-${item.section.id}`}>{DETAIL_PAGE_MODULE_DEFINITIONS[item.section.moduleType].label}</h3>
                {item.state === "complete" ? <Renderer item={item} /> : <PreviewPlaceholder item={item} />}
              </section>
            </article>
          );
        })}
      </div>
    </div>
  );
}
