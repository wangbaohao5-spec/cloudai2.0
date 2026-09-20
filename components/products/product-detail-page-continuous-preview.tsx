"use client";

import {
  DetailPageExistingAssetPicker,
  DetailPageSectionCopyEditor,
} from "@/components/products/product-detail-page-plan-preview";
import {
  DETAIL_PAGE_MODULE_DEFINITIONS,
  canBindExistingAssetToModule,
  evaluateDetailPageReadiness,
  type DetailPageAssetCandidate,
  type DetailPageModuleType,
  type DetailPageProjectOperation,
  type DetailPageProjectV2,
} from "@/lib/detail-page-project";
import {
  DETAIL_PAGE_LOGICAL_WIDTH,
  buildDetailPagePreview,
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
  onBackToBuild: () => void;
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

  if (!item.asset?.previewUrl) return null;

  return (
    // Existing asset candidates already provide short-lived, product-scoped preview URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`${DETAIL_PAGE_MODULE_DEFINITIONS[item.section.moduleType].label}：${item.asset.name}`}
      decoding="async"
      loading={item.section.order === 1 ? "eager" : "lazy"}
      src={item.asset.previewUrl}
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
  onGenerateSection,
  onOperation,
  total,
}: {
  candidates: DetailPageAssetCandidate[];
  disabled: boolean;
  index: number;
  isLoadingAssets: boolean;
  item: DetailPagePreviewSection;
  onBackToBuild: () => void;
  onGenerateSection: (sectionId: string) => void;
  onOperation: (operation: DetailPageProjectOperation) => void;
  total: number;
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
  generatingSectionId = "",
  isLoadingAssets = false,
  isUpdating = false,
  onBackToBuild,
  onGenerateSection,
  onOperation,
  project,
}: ProductDetailPageContinuousPreviewProps) {
  const preview = buildDetailPagePreview(project, candidates);
  const disabled = isUpdating || Boolean(generatingSectionId) || project.sections.some((section) => section.lifecycle === "GENERATING");

  return (
    <div className="product-detail-preview-workspace">
      <div className="product-detail-preview-heading">
        <div>
          <p>Continuous Preview · {DETAIL_PAGE_LOGICAL_WIDTH}px</p>
          <h3>连续详情页预览</h3>
          <span>版式、顺序、文案和素材绑定会保存到当前详情页项目。</span>
        </div>
        <button className="cai-button cai-button--secondary" disabled type="button" title="Phase 3B 提供导出能力">导出 · 下一阶段</button>
      </div>

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
                total={preview.visible.length}
                onBackToBuild={onBackToBuild}
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
