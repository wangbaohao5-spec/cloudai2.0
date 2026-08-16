import { buildProductGenerationBriefPrompt } from "@/lib/ai/product-generation-brief-prompt-builder";
import type { ProductGenerationBrief, ProductImageAnalysis } from "@/lib/product-types";
import type { CopywritingResult, HistoryRecord } from "@/lib/types";

export type ProductDetailPageStyle = "brand-site" | "ecommerce" | "minimal" | "xiaohongshu";
export type ProductDetailPageCount = 3 | 5 | 8;
export type ProductDetailPageSectionType =
  | "comparison"
  | "cta"
  | "detail-closeup"
  | "feature"
  | "flat-lay"
  | "four-grid-detail"
  | "hero"
  | "material-detail"
  | "model-wearing"
  | "multi-color"
  | "selling-point"
  | "specification"
  | "trust"
  | "usage-scene";

export type ProductDetailPagePlanInput = {
  analysis: ProductImageAnalysis;
  copywritingRecords: HistoryRecord[];
  count: ProductDetailPageCount;
  generationBrief?: ProductGenerationBrief | null;
  productTitle: string;
  style: ProductDetailPageStyle;
};

export type ProductDetailPagePlanPage = {
  bodyCopy: string;
  headline: string;
  notes: string;
  pageIndex: number;
  sectionTitle: string;
  sectionType: ProductDetailPageSectionType;
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

function getPageStructureGuide(count: ProductDetailPageCount) {
  if (count === 3) {
    return [
      "count = 3 推荐结构：",
      "1. hero：主视觉 / 首屏卖点",
      "2. selling-point：核心卖点",
      "3. cta：购买理由 / 总结",
    ].join("\n");
  }

  if (count === 5) {
    return [
      "count = 5 推荐结构：",
      "1. hero：主视觉",
      "2. selling-point：核心卖点",
      "3. usage-scene：使用场景",
      "4. detail-closeup：细节特写",
      "5. cta：购买理由 / 总结",
    ].join("\n");
  }

  return [
    "count = 8 推荐结构：",
    "1. hero：主视觉",
    "2. selling-point：核心卖点",
    "3. usage-scene：使用场景",
    "4. detail-closeup：关键细节",
    "5. four-grid-detail：四宫格细节",
    "6. material-detail / model-wearing / flat-lay / multi-color：根据类目选择",
    "7. trust / comparison / specification：根据商品选择",
    "8. cta：总结购买理由",
  ].join("\n");
}

function getCategoryPlanningGuide(analysis: ProductImageAnalysis) {
  const categoryText = `${analysis.category || ""} ${(analysis.productNameSuggestions || []).join(" ")}`.toLowerCase();

  if (/键盘|keyboard|keycap|mechanical/.test(categoryText)) {
    return "键盘 / 电子产品：优先使用 hero、usage-scene、detail-closeup、four-grid-detail、specification、cta；可规划桌搭、背光氛围、键帽细节、连接线/接口细节，但不要改变键位布局。";
  }

  if (/衣|服装|t恤|t-shirt|shirt|clothing|apparel|背心|裙|卫衣/.test(categoryText)) {
    return "服装：优先使用 hero、model-wearing、flat-lay、material-detail、detail-closeup、usage-scene、multi-color、cta；展示上身效果、平铺、面料、领口/袖口/下摆和穿搭场景。";
  }

  if (/首饰|手链|项链|戒指|耳环|jewelry|bracelet|necklace|ring|bead/.test(categoryText)) {
    return "首饰：优先使用 hero、material-detail、detail-closeup、usage-scene、four-grid-detail、trust、cta；展示材质纹理、佩戴效果、礼物场景和特殊点缀细节。";
  }

  if (/护肤|洁面|面霜|乳液|精华|skincare|cleanser|cream|lotion|serum/.test(categoryText)) {
    return "护肤品：优先使用 hero、selling-point、material-detail、usage-scene、four-grid-detail、trust、cta；展示水感、泡沫、质地、清洁感和温和氛围。";
  }

  if (/鞋|shoe|sneaker|boot|sandal/.test(categoryText)) {
    return "鞋：优先使用 hero、detail-closeup、material-detail、usage-scene、selling-point、comparison、cta；展示侧面、鞋底、鞋面、穿搭/行走场景和舒适卖点。";
  }

  if (/杯|水杯|保温杯|马克杯|cup|mug|bottle|tumbler|thermos/.test(categoryText)) {
    return "杯子：优先使用 hero、usage-scene、detail-closeup、four-grid-detail、multi-color、specification、cta；展示办公室、通勤、杯盖/杯口、便携和多色/多规格。";
  }

  return "通用商品：根据商品卖点选择 hero、selling-point、usage-scene、detail-closeup、four-grid-detail、material-detail、specification、trust、cta。";
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

export function buildProductDetailPagePlanPrompt({ analysis, copywritingRecords, count, generationBrief, productTitle, style }: ProductDetailPagePlanInput) {
  const productName = analysis.productNameSuggestions[0] || productTitle || analysis.category || "商品";
  const generationBriefPrompt = buildProductGenerationBriefPrompt(generationBrief);

  return [
    `你是专业电商详情页策划，请基于商品分析和已有文案，规划 ${count} 张商品详情页图片的图文结构。`,
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
    `pages.length 必须等于 ${count}。`,
    "pageIndex 必须从 1 开始连续递增。",
    "允许 sectionType：hero、selling-point、usage-scene、detail-closeup、four-grid-detail、material-detail、model-wearing、flat-lay、multi-color、specification、comparison、trust、cta。",
    getPageStructureGuide(count),
    getCategoryPlanningGuide(analysis),
    generationBriefPrompt,
    "每页作用必须不同，headline / sellingPoint / visualDirection 不要重复。",
    "不要把同一个卖点硬拆成很多重复页面。卖点不足时，自动补充使用场景、细节特写、四宫格细节、佩戴/上身/使用效果、多色/多规格展示、总结 CTA。",
    "不要夸大功效，不要生成虚假参数，不要编造认证、销量、价格、品牌授权或医学功效。",
    "中文文案要自然、专业、单页文字不要太长，并适合后续生成电商详情页图片。",
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
