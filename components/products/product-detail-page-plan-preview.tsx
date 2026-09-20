"use client";

import {
  DETAIL_PAGE_MODULE_DEFINITIONS,
  DETAIL_PAGE_MODULE_TYPES,
  canBindExistingAssetToModule,
  evaluateDetailPageReadiness,
  getActiveDetailPageGeneration,
  getDetailPageSectionEffectiveState,
  type DetailPageAssetCandidate,
  type DetailPageModuleType,
  type DetailPageProjectOperation,
  type DetailPageProjectV2,
  type DetailPageSectionV2,
} from "@/lib/detail-page-project";
import { useEffect, useState } from "react";

type ProductDetailPagePlanPreviewProps = {
  candidates: DetailPageAssetCandidate[];
  generatingSectionId?: string;
  isLoadingAssets?: boolean;
  isUpdating?: boolean;
  onGenerateSection: (sectionId: string) => void;
  onOperation: (operation: DetailPageProjectOperation) => void;
  project: DetailPageProjectV2;
};

const ASSET_SOURCE_LABELS: Record<DetailPageAssetCandidate["sourceType"], string> = {
  original: "商品原图",
  "image-edit": "原图优化",
  "image-set": "商品套图",
  "detail-page": "历史详情页",
  "scene-image": "场景图",
  "product-image": "商品图片",
};

const READINESS_LABELS = {
  READY: "可继续",
  NEEDS_INPUT: "需要补充",
  EXISTING_ASSET: "已有素材",
  OPTIONAL: "可选",
} as const;

const LIFECYCLE_LABELS = {
  PLANNED: "待制作",
  GENERATING: "正在制作",
  COMPLETE: "已完成",
  FAILED: "制作失败",
} as const;

function getConfirmedEvidenceValue(section: DetailPageSectionV2) {
  const field = DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType].evidenceField;
  return section.evidence.find((item) => item.sourceType === "user-confirmed" && item.field === field)?.value || "";
}

function EvidenceInput({ disabled, onSave, section }: { disabled: boolean; onSave: (value: string) => void; section: DetailPageSectionV2 }) {
  const [value, setValue] = useState(() => getConfirmedEvidenceValue(section));

  useEffect(() => {
    setValue(getConfirmedEvidenceValue(section));
  }, [section]);

  if (section.readiness !== "NEEDS_INPUT" && !getConfirmedEvidenceValue(section)) {
    return null;
  }

  const definition = DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType];

  return (
    <div className="product-detail-evidence-input">
      <label htmlFor={`detail-page-evidence-${section.id}`}>{definition.inputLabel}</label>
      <textarea
        id={`detail-page-evidence-${section.id}`}
        disabled={disabled}
        maxLength={1200}
        placeholder={section.moduleType === "PRODUCT_DETAIL" ? "说明现有图片是否足以展示细节，或记录还需要补充的参考图。" : "只填写你能够确认、愿意用于详情页的真实资料。"}
        rows={3}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div>
        <span>AI 分析不会自动作为已验证事实。</span>
        <button className="cai-button cai-button--secondary cai-button--sm" disabled={disabled} type="button" onClick={() => onSave(value.trim())}>
          保存资料
        </button>
      </div>
    </div>
  );
}

function SectionCopyEditor({ disabled, onSave, section }: { disabled: boolean; onSave: (headline: string, body: string) => void; section: DetailPageSectionV2 }) {
  const [headline, setHeadline] = useState(section.copy.headline);
  const [body, setBody] = useState(section.copy.body);

  useEffect(() => {
    setHeadline(section.copy.headline);
    setBody(section.copy.body);
  }, [section.copy.body, section.copy.headline]);

  const unchanged = headline.trim() === section.copy.headline && body.trim() === section.copy.body;

  return (
    <div className="product-detail-copy-editor">
      <strong>模块文案</strong>
      <label>
        <span>标题</span>
        <input disabled={disabled} maxLength={200} value={headline} onChange={(event) => setHeadline(event.target.value)} />
      </label>
      <label>
        <span>正文</span>
        <textarea disabled={disabled} maxLength={800} rows={3} value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      <div>
        <small>文案会作为结构化内容保存，不会要求图片模型绘制文字。</small>
        <button className="cai-button cai-button--secondary cai-button--sm" disabled={disabled || unchanged} type="button" onClick={() => onSave(headline.trim(), body.trim())}>
          保存文案
        </button>
      </div>
    </div>
  );
}

function ExistingAssetPicker({
  candidates,
  disabled,
  isLoading,
  onOperation,
  section,
}: {
  candidates: DetailPageAssetCandidate[];
  disabled: boolean;
  isLoading: boolean;
  onOperation: (operation: DetailPageProjectOperation) => void;
  section: DetailPageSectionV2;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCandidate = section.selectedAssetId ? candidates.find((candidate) => candidate.assetId === section.selectedAssetId) : null;
  const isMissing = Boolean(section.selectedAssetId && !selectedCandidate && !isLoading);
  const isPreviewUnavailable = Boolean(section.selectedAssetId && selectedCandidate && !selectedCandidate.previewUrl && !isLoading);
  const suggestedCount = candidates.filter((candidate) => candidate.suggestedModuleTypes.includes(section.moduleType)).length;

  if (!canBindExistingAssetToModule(section.moduleType)) {
    return null;
  }

  return (
    <div className="product-detail-existing-assets">
      <div className="product-detail-existing-assets-header">
        <div>
          <strong>{section.selectedAssetId ? "当前使用素材" : "已有素材"}</strong>
          <span>
            {isLoading
              ? "正在读取当前商品素材..."
              : section.selectedAssetId
                ? isMissing
                  ? "素材暂不可用，请重新选择"
                  : isPreviewUnavailable
                    ? "预览暂不可用，素材绑定已保留"
                  : "已绑定到当前模块，刷新后仍会保留"
                : candidates.length
                  ? `当前商品有 ${candidates.length} 个可用素材${suggestedCount ? `，其中 ${suggestedCount} 个与本模块匹配` : ""}`
                  : "当前商品暂无可复用图片"}
          </span>
        </div>
        <div>
          {candidates.length ? (
            <button className="cai-button cai-button--secondary cai-button--sm" disabled={disabled || isLoading} type="button" onClick={() => setIsOpen((value) => !value)}>
              {section.selectedAssetId ? "替换" : "选择已有素材"}
            </button>
          ) : null}
          {section.selectedAssetId ? (
            <button className="cai-button cai-button--ghost cai-button--sm" disabled={disabled} type="button" onClick={() => onOperation({ type: "unbind-asset", sectionId: section.id })}>
              移除
            </button>
          ) : null}
        </div>
      </div>

      {section.selectedAssetId ? (
        <div className={`product-detail-bound-asset${isMissing || isPreviewUnavailable ? " is-unavailable" : ""}`}>
          {selectedCandidate?.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={selectedCandidate.name} decoding="async" loading="lazy" src={selectedCandidate.previewUrl} />
          ) : (
            <span className="product-detail-asset-placeholder">预览暂不可用</span>
          )}
          <div>
            <strong>{selectedCandidate?.name || "原绑定素材不可用"}</strong>
            <span>{selectedCandidate ? ASSET_SOURCE_LABELS[selectedCandidate.sourceType] : "可重新选择当前商品的其它素材"}</span>
          </div>
        </div>
      ) : null}

      {isOpen ? (
        <div className="product-detail-asset-picker" aria-label={`${DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType].label}可用素材`}>
          {candidates.map((candidate) => {
            const isSuggested = candidate.suggestedModuleTypes.includes(section.moduleType);
            return (
              <button
                className={candidate.assetId === section.selectedAssetId ? "is-selected" : ""}
                disabled={disabled}
                key={candidate.assetId}
                type="button"
                onClick={() => {
                  onOperation({ type: "bind-asset", sectionId: section.id, assetId: candidate.assetId });
                  setIsOpen(false);
                }}
              >
                {candidate.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" decoding="async" loading="lazy" src={candidate.previewUrl} />
                ) : (
                  <span className="product-detail-asset-placeholder">预览暂不可用</span>
                )}
                <span>
                  <strong>{candidate.name}</strong>
                  <small>{ASSET_SOURCE_LABELS[candidate.sourceType]} · {new Date(candidate.createdAt).toLocaleDateString("zh-CN")}</small>
                  {isSuggested ? <em>推荐</em> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DetailPageSectionCard({
  disabled,
  candidates,
  index,
  isLoadingAssets,
  onGenerateSection,
  onOperation,
  section,
  total,
}: {
  disabled: boolean;
  candidates: DetailPageAssetCandidate[];
  index: number;
  isLoadingAssets: boolean;
  onGenerateSection: (sectionId: string) => void;
  onOperation: (operation: DetailPageProjectOperation) => void;
  section: DetailPageSectionV2;
  total: number;
}) {
  const [replacement, setReplacement] = useState<DetailPageModuleType>(section.moduleType);
  const definition = DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType];
  const selectedCandidate = section.selectedAssetId ? candidates.find((candidate) => candidate.assetId === section.selectedAssetId) : null;
  const selectedAssetAvailable = Boolean(
    section.selectedAssetId && (isLoadingAssets || selectedCandidate?.previewUrl),
  );
  const effectiveState = getDetailPageSectionEffectiveState(section, selectedAssetAvailable);
  const generationReadiness = evaluateDetailPageReadiness(section.moduleType, section.evidence, null);
  const supportsGeneration = canBindExistingAssetToModule(section.moduleType);
  const canGenerate = supportsGeneration && generationReadiness === "READY";
  const isGenerating = section.lifecycle === "GENERATING";

  useEffect(() => {
    setReplacement(section.moduleType);
  }, [section.moduleType]);

  return (
    <article className="product-detail-v2-section-card">
      <header>
        <div>
          <span className="product-detail-v2-order">{String(section.order).padStart(2, "0")}</span>
          <div>
            <p>{definition.kind}</p>
            <h3>{definition.label}</h3>
          </div>
        </div>
        <div className="product-detail-v2-section-statuses">
          <span className={`product-detail-readiness product-detail-readiness--${effectiveState.readiness.toLowerCase().replace("_", "-")}`}>
            {READINESS_LABELS[effectiveState.readiness]}
          </span>
          <span className={`product-detail-lifecycle product-detail-lifecycle--${section.lifecycle.toLowerCase()}`}>{LIFECYCLE_LABELS[section.lifecycle]}</span>
        </div>
      </header>

      <div className="product-detail-v2-section-copy">
        <p>{section.purpose}</p>
        <span>{section.reason}</span>
      </div>

      <SectionCopyEditor
        disabled={disabled}
        section={section}
        onSave={(headline, body) => onOperation({ type: "set-copy", sectionId: section.id, headline, body })}
      />

      <EvidenceInput disabled={disabled} section={section} onSave={(value) => onOperation({ type: "set-evidence", sectionId: section.id, value })} />

      <ExistingAssetPicker candidates={candidates} disabled={disabled} isLoading={isLoadingAssets} section={section} onOperation={onOperation} />

      {supportsGeneration ? (
        <div className="product-detail-generation-action">
          <div>
            <strong>{section.selectedAssetId ? "生成替代版本" : "制作模块视觉"}</strong>
            <span>
              {isGenerating
                ? "正在基于商品原图制作，当前素材会继续保留。"
                : canGenerate
                  ? "生成只产出视觉素材，标题与正文仍保持为结构化数据。"
                  : "补充并确认当前模块所需资料后才可生成。"}
            </span>
          </div>
          <button className="cai-button cai-button--primary cai-button--sm" disabled={disabled || !canGenerate || isGenerating} type="button" onClick={() => onGenerateSection(section.id)}>
            {isGenerating ? "正在制作…" : section.lifecycle === "FAILED" && !section.selectedAssetId ? "重试此模块" : section.selectedAssetId ? "生成新版本" : "生成视觉"}
          </button>
          {section.lastError ? <p className="product-detail-generation-error" role="status">{section.lastError}{section.selectedAssetId ? " 当前素材未受影响。" : ""}</p> : null}
        </div>
      ) : (
        <p className="product-detail-structured-only-note">此模块以结构化内容为主，本阶段不要求生成图片。</p>
      )}

      <footer>
        <div className="product-detail-v2-move-actions" aria-label={`${definition.label}排序操作`}>
          <button
            className="cai-button cai-button--ghost cai-button--sm"
            disabled={disabled || index === 0}
            type="button"
            onClick={() => onOperation({ type: "move-section", sectionId: section.id, direction: "up" })}
          >
            上移
          </button>
          <button
            className="cai-button cai-button--ghost cai-button--sm"
            disabled={disabled || index === total - 1}
            type="button"
            onClick={() => onOperation({ type: "move-section", sectionId: section.id, direction: "down" })}
          >
            下移
          </button>
        </div>
        <div className="product-detail-v2-replace-actions">
          <label>
            <span className="sr-only">替换模块类型</span>
            <select disabled={disabled} value={replacement} onChange={(event) => setReplacement(event.target.value as DetailPageModuleType)}>
              {DETAIL_PAGE_MODULE_TYPES.map((moduleType) => (
                <option key={moduleType} value={moduleType}>
                  {DETAIL_PAGE_MODULE_DEFINITIONS[moduleType].label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="cai-button cai-button--secondary cai-button--sm"
            disabled={disabled || replacement === section.moduleType}
            type="button"
            onClick={() => onOperation({ type: "replace-module", sectionId: section.id, moduleType: replacement })}
          >
            替换
          </button>
          <button
            className="cai-button cai-button--ghost cai-button--sm"
            disabled={disabled || total <= 3}
            type="button"
            onClick={() => onOperation({ type: "delete-section", sectionId: section.id })}
          >
            删除
          </button>
        </div>
      </footer>
    </article>
  );
}

export function ProductDetailPagePlanPreview({ candidates, generatingSectionId = "", isLoadingAssets = false, isUpdating = false, onGenerateSection, onOperation, project }: ProductDetailPagePlanPreviewProps) {
  const activeGeneration = getActiveDetailPageGeneration(project);
  const projectBusy = Boolean(activeGeneration || generatingSectionId);

  return (
    <div className="product-detail-v2-plan" aria-label="详情页策划结构">
      {project.sections.map((section, index) => (
        <DetailPageSectionCard
          key={section.id}
          candidates={candidates}
          disabled={isUpdating || projectBusy}
          index={index}
          isLoadingAssets={isLoadingAssets}
          section={section}
          total={project.sections.length}
          onGenerateSection={onGenerateSection}
          onOperation={onOperation}
        />
      ))}
    </div>
  );
}
