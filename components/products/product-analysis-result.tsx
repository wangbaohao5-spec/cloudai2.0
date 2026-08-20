"use client";

import type { ProductImageAnalysis } from "@/lib/product-types";
import { useState } from "react";

type ProductAnalysisResultProps = {
  analysis: ProductImageAnalysis | null;
  defaultShowFullAnalysis?: boolean;
  showEnhancedFields?: boolean;
  showFullAnalysisToggle?: boolean;
  title?: string;
};

function DetailList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="muted">暂无明确结果</p>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function compactItems(...groups: Array<string[] | string | undefined>) {
  return groups
    .flatMap((group) => {
      if (!group) {
        return [];
      }

      return Array.isArray(group) ? group : [group];
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactUnknownItems(...groups: unknown[]) {
  return groups
    .flatMap((group) => {
      if (!group) {
        return [];
      }

      return Array.isArray(group) ? group : [group];
    })
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasEnhancedFields(analysis: ProductImageAnalysis) {
  const detailPageHints = analysis.detailPageHints;

  return Boolean(
    compactUnknownItems(analysis.specifications, analysis.capacity, analysis.colors, analysis.color, analysis.variants, analysis.materials, analysis.material).length ||
      compactUnknownItems(analysis.mustKeepDetails, analysis.avoidChanges).length ||
      compactUnknownItems(detailPageHints?.usageScenes, detailPageHints?.detailAngles, detailPageHints?.visualMood, analysis.visualFidelityNotes).length,
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="product-analysis-chip-list">
      {items.map((item, index) => (
        <span className="product-analysis-chip" key={`${item}-${index}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function NoteList({ items }: { items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <ul className="product-analysis-note-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function ProductAnalysisEnhancedFields({ analysis }: { analysis: ProductImageAnalysis }) {
  const specifications = compactUnknownItems(analysis.specifications, analysis.capacity);
  const colorsAndVariants = compactUnknownItems(analysis.colors, analysis.color, analysis.variants);
  const materials = compactUnknownItems(analysis.materials, analysis.material);
  const mustKeepDetails = compactUnknownItems(analysis.mustKeepDetails);
  const avoidChanges = compactUnknownItems(analysis.avoidChanges);
  const usageScenes = compactUnknownItems(analysis.detailPageHints?.usageScenes);
  const detailAngles = compactUnknownItems(analysis.detailPageHints?.detailAngles);
  const visualMood = compactUnknownItems(analysis.detailPageHints?.visualMood, analysis.visualFidelityNotes);

  if (!hasEnhancedFields(analysis)) {
    return null;
  }

  return (
    <div className="product-analysis-extra">
      <div className="product-analysis-extra-header">
        <strong>商品理解与生成约束</strong>
        <span>这些信息会帮助后续商品图、商品套图和详情页制作保持商品一致性。</span>
      </div>

      <div className="product-analysis-extra-grid">
        {specifications.length ? (
          <section className="product-analysis-extra-card">
            <strong>商品规格</strong>
            <ChipList items={specifications} />
          </section>
        ) : null}

        {colorsAndVariants.length ? (
          <section className="product-analysis-extra-card">
            <strong>颜色 / 款式</strong>
            <ChipList items={colorsAndVariants} />
          </section>
        ) : null}

        {materials.length ? (
          <section className="product-analysis-extra-card">
            <strong>材质</strong>
            <ChipList items={materials} />
          </section>
        ) : null}

        {mustKeepDetails.length ? (
          <section className="product-analysis-extra-card product-analysis-extra-card-wide">
            <strong>必须保留</strong>
            <p>后续生成图片时会尽量保持这些商品细节不变。</p>
            <NoteList items={mustKeepDetails} />
          </section>
        ) : null}

        {avoidChanges.length ? (
          <section className="product-analysis-extra-card product-analysis-extra-card-wide">
            <strong>避免改动</strong>
            <p>后续生成图片时会避免改变这些结构、颜色或图案。</p>
            <NoteList items={avoidChanges} />
          </section>
        ) : null}

        {usageScenes.length || detailAngles.length || visualMood.length ? (
          <section className="product-analysis-extra-card product-analysis-extra-card-wide">
            <strong>适合的详情页方向</strong>
            {usageScenes.length ? (
              <div>
                <span>使用场景</span>
                <ChipList items={usageScenes} />
              </div>
            ) : null}
            {detailAngles.length ? (
              <div>
                <span>细节角度</span>
                <ChipList items={detailAngles} />
              </div>
            ) : null}
            {visualMood.length ? (
              <div>
                <span>视觉氛围</span>
                <ChipList items={visualMood} />
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function ProductAnalysisResult({
  analysis,
  defaultShowFullAnalysis = false,
  showEnhancedFields = false,
  showFullAnalysisToggle = true,
  title,
}: ProductAnalysisResultProps) {
  const [isExpanded, setIsExpanded] = useState(defaultShowFullAnalysis);
  const primaryName = analysis?.productNameSuggestions[0] || "暂无明确建议";
  const summaryPoints = analysis?.sellingPoints.slice(0, 3) || [];

  return (
    <div className="product-analysis-result glass-card">
      <p className="eyebrow">分析结果</p>
      <h2>{title || "商品图片分析结果"}</h2>

      {!analysis ? (
        <div className="copywriting-result-empty">
          <p>上传商品图片并点击分析后，这里会展示商品类别、名称建议、卖点、目标用户和使用场景。</p>
        </div>
      ) : (
        <div className="product-analysis-summary">
          <div className="product-analysis-summary-grid">
            <section>
              <strong>商品类别</strong>
              <p>{analysis.category}</p>
            </section>
            <section>
              <strong>商品名称建议</strong>
              <p>{primaryName}</p>
            </section>
            <section>
              <strong>目标用户</strong>
              <p>{analysis.targetAudience}</p>
            </section>
            <section>
              <strong>前 3 条核心卖点</strong>
              <DetailList items={summaryPoints} />
            </section>
          </div>

          {showEnhancedFields ? <ProductAnalysisEnhancedFields analysis={analysis} /> : null}

          {showFullAnalysisToggle ? (
            <button className="product-analysis-toggle" type="button" onClick={() => setIsExpanded((current) => !current)}>
              {isExpanded ? "收起完整分析" : "查看完整分析"}
            </button>
          ) : null}

          {isExpanded ? (
            <div className="product-analysis-grid">
              <section>
                <strong>商品名称建议</strong>
                <DetailList items={analysis.productNameSuggestions} />
              </section>
              <section>
                <strong>商品特点</strong>
                <DetailList items={analysis.features} />
              </section>
              <section>
                <strong>使用场景</strong>
                <DetailList items={analysis.scenes} />
              </section>
              <section>
                <strong>视觉风格</strong>
                <p>{analysis.visualStyle}</p>
              </section>
              {!showEnhancedFields ? (
                <>
                  <section>
                    <strong>材质 / 颜色</strong>
                    <DetailList items={compactItems(analysis.materials, analysis.material, analysis.colors, analysis.color)} />
                  </section>
                  <section>
                    <strong>规格 / 容量</strong>
                    <DetailList items={compactItems(analysis.specifications, analysis.capacity)} />
                  </section>
                  <section>
                    <strong>多款式信息</strong>
                    <DetailList items={analysis.variants || []} />
                  </section>
                  <section className="product-analysis-wide">
                    <strong>必须保留的细节</strong>
                    <DetailList items={analysis.mustKeepDetails || []} />
                  </section>
                  <section className="product-analysis-wide">
                    <strong>避免改动</strong>
                    <DetailList items={analysis.avoidChanges || []} />
                  </section>
                </>
              ) : null}
              <section className="product-analysis-wide">
                <strong>风险提示</strong>
                <DetailList items={analysis.risks} />
              </section>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
