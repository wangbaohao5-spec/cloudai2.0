"use client";

import type { ProductCreationCenterAsset, ProductCreationCenterData } from "@/lib/product-creation-center";

type ProductCreationSummaryProps = {
  analysis: ProductCreationCenterData["analysis"];
  counts: {
    copywriting: number;
    imageEdits: number;
    sceneImages: number;
  };
  originalAsset: ProductCreationCenterAsset | null;
  product: ProductCreationCenterData["product"];
};

export function ProductCreationSummary({ analysis, counts, originalAsset, product }: ProductCreationSummaryProps) {
  const productName = analysis.productNameSuggestions[0] || product.title;

  return (
    <div className="product-creation-summary">
      <div className="product-creation-original">
        {originalAsset?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={originalAsset.name || productName} src={originalAsset.url} />
        ) : (
          <span>暂无原图</span>
        )}
      </div>

      <div className="product-creation-main">
        <p className="eyebrow">Creation Center</p>
        <h2>{productName}</h2>
        <p>{analysis.category || "商品"} · {analysis.targetAudience || "目标用户待补充"}</p>
        <div className="product-creation-counts" aria-label="商品创作进度">
          <span>文案 {counts.copywriting}</span>
          <span>原图优化 {counts.imageEdits}</span>
          <span>场景图 {counts.sceneImages}</span>
        </div>
      </div>
    </div>
  );
}
