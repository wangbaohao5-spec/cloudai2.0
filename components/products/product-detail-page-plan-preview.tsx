"use client";

import {
  DETAIL_PAGE_MODULE_DEFINITIONS,
  DETAIL_PAGE_MODULE_TYPES,
  type DetailPageModuleType,
  type DetailPageProjectOperation,
  type DetailPageProjectV2,
  type DetailPageSectionV2,
} from "@/lib/detail-page-project";
import { useEffect, useState } from "react";

type ProductDetailPagePlanPreviewProps = {
  isUpdating?: boolean;
  onOperation: (operation: DetailPageProjectOperation) => void;
  project: DetailPageProjectV2;
};

const READINESS_LABELS = {
  READY: "可继续",
  NEEDS_INPUT: "需要补充",
  EXISTING_ASSET: "已有素材",
  OPTIONAL: "可选",
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

function DetailPageSectionCard({
  disabled,
  index,
  onOperation,
  section,
  total,
}: {
  disabled: boolean;
  index: number;
  onOperation: (operation: DetailPageProjectOperation) => void;
  section: DetailPageSectionV2;
  total: number;
}) {
  const [replacement, setReplacement] = useState<DetailPageModuleType>(section.moduleType);
  const definition = DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType];

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
        <span className={`product-detail-readiness product-detail-readiness--${section.readiness.toLowerCase().replace("_", "-")}`}>
          {READINESS_LABELS[section.readiness]}
        </span>
      </header>

      <div className="product-detail-v2-section-copy">
        <p>{section.purpose}</p>
        <span>{section.reason}</span>
      </div>

      {section.copy.headline || section.copy.body ? (
        <div className="product-detail-v2-draft-copy">
          <strong>文案草稿</strong>
          {section.copy.headline ? <p>{section.copy.headline}</p> : null}
          {section.copy.body ? <span>{section.copy.body}</span> : null}
          <small>草稿不代表事实已验证，发布前仍需人工确认。</small>
        </div>
      ) : null}

      <EvidenceInput disabled={disabled} section={section} onSave={(value) => onOperation({ type: "set-evidence", sectionId: section.id, value })} />

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

export function ProductDetailPagePlanPreview({ isUpdating = false, onOperation, project }: ProductDetailPagePlanPreviewProps) {
  return (
    <div className="product-detail-v2-plan" aria-label="详情页策划结构">
      {project.sections.map((section, index) => (
        <DetailPageSectionCard
          key={section.id}
          disabled={isUpdating}
          index={index}
          section={section}
          total={project.sections.length}
          onOperation={onOperation}
        />
      ))}
    </div>
  );
}
