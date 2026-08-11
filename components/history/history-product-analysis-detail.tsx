import { HistoryMediaPreview } from "@/components/history/history-media-preview";
import type { ProductImageAnalysis } from "@/lib/product-types";
import type { HistoryRecord } from "@/lib/types";

type HistoryProductAnalysisDetailProps = {
  expanded: boolean;
  record: HistoryRecord;
};

export function isProductImageAnalysis(output: unknown): output is ProductImageAnalysis {
  if (!output || typeof output !== "object") {
    return false;
  }

  const value = output as Partial<ProductImageAnalysis>;

  return typeof value.category === "string" || Array.isArray(value.sellingPoints) || Array.isArray(value.productNameSuggestions);
}

function DetailList({ items }: { items?: string[] }) {
  const visibleItems = items?.filter(Boolean) || [];

  if (!visibleItems.length) {
    return <p className="muted">暂无明确结果</p>;
  }

  return (
    <ul>
      {visibleItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function buildAnalysisText(result: ProductImageAnalysis) {
  return [
    `商品类别：\n${result.category || ""}`,
    `商品名称建议：\n${(result.productNameSuggestions || []).map((item) => `- ${item}`).join("\n")}`,
    `商品特点：\n${(result.features || []).map((item) => `- ${item}`).join("\n")}`,
    `核心卖点：\n${(result.sellingPoints || []).map((item) => `- ${item}`).join("\n")}`,
    `目标用户：\n${result.targetAudience || ""}`,
    `使用场景：\n${(result.scenes || []).map((item) => `- ${item}`).join("\n")}`,
    `视觉风格：\n${result.visualStyle || ""}`,
    `材质颜色：\n${[result.material, result.color].filter(Boolean).join(" / ")}`,
    `风险提示：\n${(result.risks || []).map((item) => `- ${item}`).join("\n")}`,
  ]
    .filter((section) => section.trim())
    .join("\n\n");
}

export function HistoryProductAnalysisDetail({ expanded, record }: HistoryProductAnalysisDetailProps) {
  if (!isProductImageAnalysis(record.output)) {
    return null;
  }

  const analysis = record.output;

  async function handleCopy() {
    await navigator.clipboard.writeText(buildAnalysisText(analysis));
  }

  return (
    <div className={`history-readable-detail history-product-analysis-detail ${expanded ? "expanded" : ""}`}>
      <HistoryMediaPreview record={record} variant="asset" />
      <div className="history-detail-grid">
        <section>
          <strong>商品类别</strong>
          <p>{analysis.category}</p>
        </section>
        <section>
          <strong>核心卖点</strong>
          <DetailList items={analysis.sellingPoints?.slice(0, expanded ? undefined : 3)} />
        </section>
        <section>
          <strong>目标用户</strong>
          <p>{analysis.targetAudience}</p>
        </section>
      </div>

      {expanded ? (
        <div className="history-detail-grid">
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
            <strong>材质颜色</strong>
            <p>{[analysis.material, analysis.color].filter(Boolean).join(" / ") || "图片中无法明确确认"}</p>
          </section>
          <section>
            <strong>风险提示</strong>
            <DetailList items={analysis.risks} />
          </section>
        </div>
      ) : null}

      <div className="history-detail-actions">
        <button type="button" onClick={handleCopy}>
          复制完整分析
        </button>
      </div>
    </div>
  );
}
