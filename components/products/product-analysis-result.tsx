import type { ProductImageAnalysis } from "@/lib/product-types";

type ProductAnalysisResultProps = {
  analysis: ProductImageAnalysis | null;
  title?: string;
};

function DetailList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="muted">暂无明确结果</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ProductAnalysisResult({ analysis, title }: ProductAnalysisResultProps) {
  return (
    <div className="product-analysis-result glass-card">
      <p className="eyebrow">Analysis Result</p>
      <h2>{title || "商品图片分析结果"}</h2>

      {!analysis ? (
        <div className="copywriting-result-empty">
          <p>上传商品图片并点击分析后，这里会展示商品类别、名称建议、卖点、目标用户和使用场景。</p>
        </div>
      ) : (
        <div className="product-analysis-grid">
          <section>
            <strong>商品类别</strong>
            <p>{analysis.category}</p>
          </section>
          <section>
            <strong>商品名称建议</strong>
            <DetailList items={analysis.productNameSuggestions} />
          </section>
          <section>
            <strong>商品特点</strong>
            <DetailList items={analysis.features} />
          </section>
          <section>
            <strong>电商卖点</strong>
            <DetailList items={analysis.sellingPoints} />
          </section>
          <section>
            <strong>目标用户</strong>
            <p>{analysis.targetAudience}</p>
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
            <strong>颜色 / 材质</strong>
            <p>{[analysis.color, analysis.material].filter(Boolean).join(" / ") || "图片中无法明确确认"}</p>
          </section>
          <section className="product-analysis-wide">
            <strong>风险提示</strong>
            <DetailList items={analysis.risks} />
          </section>
        </div>
      )}
    </div>
  );
}
