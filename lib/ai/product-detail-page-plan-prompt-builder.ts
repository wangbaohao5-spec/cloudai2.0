import type { ProductImageAnalysis } from "@/lib/product-types";
import type { CopywritingResult, HistoryRecord } from "@/lib/types";

export type ProductDetailPageStyle = "brand-site" | "ecommerce" | "minimal" | "xiaohongshu";

export type ProductDetailPagePlanInput = {
  analysis: ProductImageAnalysis;
  copywritingRecords: HistoryRecord[];
  count: 3;
  productTitle: string;
  style: ProductDetailPageStyle;
};

export type ProductDetailPagePlanPage = {
  bodyCopy: string;
  headline: string;
  notes: string;
  pageIndex: number;
  sectionTitle: string;
  sectionType: "cta" | "feature" | "hero";
  sellingPoint: string;
  subheadline: string;
  visualDirection: string;
};

export type ProductDetailPagePlan = {
  pages: ProductDetailPagePlanPage[];
};

const STYLE_GUIDES = {
  ecommerce: "电商详情页：转化清晰、卖点明确、适合淘宝/天猫/通用详情页结构。",
  xiaohongshu: "小红书种草：语气自然、有使用感和真实分享感，但不要夸张承诺。",
  "brand-site": "品牌官网：更注重品牌感、质感、价值主张和可信表达。",
  minimal: "极简高级：表达克制、留白感强、标题短而有力，避免过度促销。",
} satisfies Record<ProductDetailPageStyle, string>;

function joinList(items?: string[]) {
  return items?.filter(Boolean).join("、") || "暂无明确结果";
}

function isCopywritingResult(output: unknown): output is CopywritingResult {
  if (!output || typeof output !== "object") {
    return false;
  }

  const value = output as Partial<CopywritingResult>;

  return typeof value.title === "string" || Array.isArray(value.points) || typeof value.description === "string" || typeof value.shortVideoScript === "string";
}

function formatCopywritingRecords(records: HistoryRecord[]) {
  const snippets = records
    .slice(0, 5)
    .map((record, index) => {
      if (!isCopywritingResult(record.output)) {
        return `文案 ${index + 1}：${record.title}`;
      }

      return [
        `文案 ${index + 1}`,
        `标题：${record.output.title || "暂无"}`,
        `卖点：${joinList(record.output.points)}`,
        `描述：${record.output.description || "暂无"}`,
        `脚本：${record.output.shortVideoScript || "暂无"}`,
      ].join("\n");
    })
    .join("\n\n");

  return snippets || "当前还没有生成商品文案，请基于商品分析自行规划自然文案。";
}

export function buildProductDetailPagePlanPrompt({ analysis, copywritingRecords, count, productTitle, style }: ProductDetailPagePlanInput) {
  const productName = analysis.productNameSuggestions[0] || productTitle || analysis.category || "商品";

  return [
    "你是专业电商详情页策划，请基于商品分析和已有文案，规划 3 张商品详情页图片的图文结构。",
    "",
    "必须严格输出 JSON，不要输出 Markdown，不要添加解释文字。",
    "JSON 结构必须是：",
    `{
  "pages": [
    {
      "pageIndex": 1,
      "sectionType": "hero",
      "sectionTitle": "首屏卖点",
      "headline": "...",
      "subheadline": "...",
      "sellingPoint": "...",
      "visualDirection": "...",
      "bodyCopy": "...",
      "notes": "..."
    }
  ]
}`,
    "",
    `固定生成数量：${count} 张。`,
    "第 1 张必须是首屏卖点，sectionType 使用 hero。",
    "第 2 张必须承担核心功能 / 材质 / 使用场景之一，sectionType 使用 feature。",
    "第 3 张必须承担购买理由 / CTA，sectionType 使用 cta。",
    "3 张内容不能重复，每张承担不同转化作用。",
    "不要夸大功效，不要生成虚假参数，不要编造认证、销量、价格、品牌授权或医学功效。",
    "中文文案要自然、专业、可用于后续生成电商详情页图片。",
    "",
    `目标风格：${STYLE_GUIDES[style]}`,
    "",
    "商品信息：",
    `商品名称：${productName}`,
    `商品类别：${analysis.category || "暂无"}`,
    `目标用户：${analysis.targetAudience || "暂无"}`,
    `核心卖点：${joinList(analysis.sellingPoints)}`,
    `商品特点：${joinList(analysis.features)}`,
    `使用场景：${joinList(analysis.scenes)}`,
    `视觉风格：${analysis.visualStyle || "暂无"}`,
    `材质/颜色：${[analysis.material, analysis.color].filter(Boolean).join(" / ") || "暂无"}`,
    `风险提示：${joinList(analysis.risks)}`,
    "",
    "已有文案：",
    formatCopywritingRecords(copywritingRecords),
  ].join("\n");
}
