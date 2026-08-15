import { LongGenerationLoading } from "@/components/ui/loading";
import type { ProductDetailPagePlanPage } from "@/lib/ai/product-detail-page-plan-prompt-builder";

export type DetailPageImageResult = {
  assetId: string;
  historyId?: string;
  imageUrl: string;
  page: ProductDetailPagePlanPage;
  prompt: string;
  status: "success";
  storagePath: string;
  type: "商品详情页";
  warnings?: string[];
};

type ProductDetailPagePlanPreviewProps = {
  generatingPageIndex?: number | null;
  onGeneratePage?: (page: ProductDetailPagePlanPage) => void;
  pageErrors?: Record<number, string>;
  pageResults?: Record<number, DetailPageImageResult>;
  pages: ProductDetailPagePlanPage[];
};

const SECTION_TYPE_LABELS = {
  comparison: "对比说明",
  cta: "购买理由",
  "detail-closeup": "细节特写",
  feature: "核心内容",
  "flat-lay": "平铺展示",
  "four-grid-detail": "四宫格细节",
  hero: "首屏卖点",
  "material-detail": "材质细节",
  "model-wearing": "上身展示",
  "multi-color": "多色展示",
  "selling-point": "核心卖点",
  specification: "规格说明",
  trust: "信任背书",
  "usage-scene": "使用场景",
} satisfies Partial<Record<ProductDetailPagePlanPage["sectionType"], string>>;

export function ProductDetailPagePlanPreview({
  generatingPageIndex = null,
  onGeneratePage,
  pageErrors = {},
  pageResults = {},
  pages,
}: ProductDetailPagePlanPreviewProps) {
  if (!pages.length) {
    return null;
  }

  return (
    <div className="product-detail-plan-preview" aria-label="商品详情页规划预览">
      {pages.map((page) => {
        const isGenerating = generatingPageIndex === page.pageIndex;
        const result = pageResults[page.pageIndex];
        const error = pageErrors[page.pageIndex];

        return (
          <article className="product-detail-plan-card" key={`${page.pageIndex}-${page.sectionTitle}`}>
            <div className="product-detail-plan-card-header">
              <span>第 {page.pageIndex} 张</span>
              <em>{SECTION_TYPE_LABELS[page.sectionType] || page.sectionType}</em>
            </div>
            <h3>{page.sectionTitle}</h3>
            <dl>
              <div>
                <dt>标题</dt>
                <dd>{page.headline || "暂无"}</dd>
              </div>
              <div>
                <dt>副标题</dt>
                <dd>{page.subheadline || "暂无"}</dd>
              </div>
              <div>
                <dt>核心卖点</dt>
                <dd>{page.sellingPoint || "暂无"}</dd>
              </div>
              <div>
                <dt>画面建议</dt>
                <dd>{page.visualDirection || "暂无"}</dd>
              </div>
              <div>
                <dt>文案建议</dt>
                <dd>{page.bodyCopy || "暂无"}</dd>
              </div>
            </dl>
            {page.notes ? <p>{page.notes}</p> : null}

            {result ? (
              <div className="product-detail-generated-preview">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={`第 ${page.pageIndex} 张详情页生成结果`} decoding="async" loading="lazy" src={result.imageUrl} />
                </div>
                <span>已生成详情页图片</span>
              </div>
            ) : null}

            {error ? <p className="image-generation-error">{error}</p> : null}

            <div className="product-detail-plan-card-actions">
              <button className="button secondary" disabled={isGenerating} type="button" onClick={() => onGeneratePage?.(page)}>
                {isGenerating ? (
                  <>
                    <LongGenerationLoading size="sm" />
                    正在生成...
                  </>
                ) : result ? (
                  "重新生成这张详情图"
                ) : (
                  "生成这张详情图"
                )}
              </button>
              <small>AI 生成图中文字可能需要人工检查。</small>
            </div>
          </article>
        );
      })}
    </div>
  );
}
