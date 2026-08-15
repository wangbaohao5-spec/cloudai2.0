"use client";

import type { ProductImageAnalysis } from "@/lib/product-types";
import { useState } from "react";

type ProductAnalysisResultProps = {
  analysis: ProductImageAnalysis | null;
  defaultShowFullAnalysis?: boolean;
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

export function ProductAnalysisResult({ analysis, defaultShowFullAnalysis = false, showFullAnalysisToggle = true, title }: ProductAnalysisResultProps) {
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
              <section>
                <strong>材质 / 颜色</strong>
                <p>{[analysis.material, analysis.color].filter(Boolean).join(" / ") || "图片中无法明确确认"}</p>
              </section>
              <section>
                <strong>规格 / 容量</strong>
                <p>{[analysis.specifications, analysis.capacity].filter(Boolean).join(" / ") || "暂无明确结果"}</p>
              </section>
              <section>
                <strong>多款式信息</strong>
                <DetailList items={analysis.variants || []} />
              </section>
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
