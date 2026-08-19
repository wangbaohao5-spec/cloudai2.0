import { getProductCategoryVisualStrategy } from "@/lib/ai/product-category-visual-strategy";
import { buildProductGenerationBriefPrompt } from "@/lib/ai/product-generation-brief-prompt-builder";
import { PRODUCT_GENERATION_RULES_BLOCK } from "@/lib/ai/product-generation-rules";
import { buildProductOutputSettingsPrompt } from "@/lib/ai/product-output-settings-prompt-builder";
import type { ProductGenerationBrief, ProductImageAnalysis, ProductOutputSettings, ProductVisualGenerationMode } from "@/lib/product-types";

export type ProductImageSetPurpose = "quick-listing" | "detail-page" | "social-seeding" | "platform-listing";
export type ProductImageSetSmartCount = 3 | 5 | 7 | 8;
export type ProductImageSetPlanCount = number;
export type ProductImageSetCount = ProductImageSetPlanCount;
export type ProductImageSetStructureMode = "custom" | "smart";
export type ProductImageSetCustomStructure = {
  comparison?: number;
  detailCloseup?: number;
  other?: number;
  sellingPoint?: number;
  sizeSpec?: number;
  usageScene?: number;
  whiteBackground?: number;
};
export type ProductImageSetImageType =
  | "brand-story"
  | "comparison"
  | "cta"
  | "detail-closeup"
  | "four-grid-detail"
  | "hero"
  | "model-wearing"
  | "multi-angle"
  | "selling-point"
  | "size-spec"
  | "usage-scene"
  | "white-background";

export type ProductImageSetPlanImage = {
  imageIndex: number;
  imageType: ProductImageSetImageType;
  title: string;
  goal: string;
  headline: string;
  subheadline: string;
  keyMessage: string;
  visualDirection: string;
  requiredElements: string[];
  mustKeep: string[];
  avoid: string[];
  suggestedGenerationMode: ProductVisualGenerationMode;
};

export type ProductImageSetPlan = {
  purpose: ProductImageSetPurpose;
  count: ProductImageSetPlanCount;
  images: ProductImageSetPlanImage[];
};

type ProductImageSetPlanPromptInput = {
  analysis: ProductImageAnalysis;
  count: ProductImageSetPlanCount;
  customStructure?: ProductImageSetCustomStructure | null;
  generationBrief?: ProductGenerationBrief | null;
  outputSettings?: ProductOutputSettings | null;
  productTitle: string;
  purpose: ProductImageSetPurpose;
  structureMode?: ProductImageSetStructureMode;
};

const PURPOSE_GUIDES = {
  "quick-listing": [
    "快速上架：优先规划白底主图、核心卖点图、场景图、细节图、CTA。",
    "目标是让用户快速得到能用于上架后台和基础详情展示的一组图。",
  ],
  "detail-page": [
    "详情页套图：优先规划首屏主视觉、核心卖点图、使用场景图、商品细节图、四宫格细节图、尺寸/参数图、CTA。",
    "目标是形成完整电商详情页结构，页面之间要有清晰叙事递进。",
  ],
  "social-seeding": [
    "社媒种草：优先规划场景氛围图、人物/使用图、种草文案图、细节图、生活方式图。",
    "目标是适合小红书、抖音、朋友圈等内容场景，画面更生活化但不夸大。",
  ],
  "platform-listing": [
    "平台 Listing：优先规划白底主图、多角度图、核心卖点图、尺寸/参数图、使用场景图、细节图。",
    "目标是适合 Amazon / Shopee / TikTok Shop 等跨境或平台商品图，表达清楚可信。",
  ],
} satisfies Record<ProductImageSetPurpose, string[]>;

const CATEGORY_IMAGE_SET_GUIDES = {
  skincare: "护肤品：适合 hero、selling-point、detail-closeup（水感/泡沫/质地）、usage-scene、brand-story/信任氛围、cta；必须保留瓶型、包装、Logo、容量信息和瓶盖结构。",
  clothing: "服装：适合 model-wearing、detail-closeup、size-spec、usage-scene、面料/领口/袖口/下摆细节；必须保留颜色、版型、印花位置和面料质感。",
  jewelry: "首饰：适合 detail-closeup、佩戴效果 usage-scene、four-grid-detail、礼物/生活方式场景；必须保留珠子数量印象、颜色、点缀位置、吊坠形状和材质。",
  keyboard: "键盘/电子产品：适合 hero、桌搭 usage-scene、detail-closeup、four-grid-detail、size-spec/连接细节；结构敏感，必须保留键位布局、键帽字符、灯光颜色、图案位置和线材位置。",
  shoes: "鞋：适合 hero、multi-angle、鞋底/鞋面 detail-closeup、outfit/usage-scene、舒适卖点图；必须保留鞋型、鞋底结构、Logo 和配色。",
  cup: "杯子：适合 hero、usage-scene、杯盖/杯口 detail-closeup、multi-color、便携/防漏细节、cta；必须保留杯型、杯盖、手柄、材质和图案。",
  general: "通用商品：根据商品卖点选择 hero、selling-point、usage-scene、detail-closeup、four-grid-detail、size-spec、brand-story、cta。",
} satisfies Record<ReturnType<typeof getProductCategoryVisualStrategy>["categoryKey"], string>;

function joinList(items?: string[]) {
  return items?.filter(Boolean).join("、") || "暂无明确结果";
}

function getCountGuide(count: ProductImageSetPlanCount) {
  if (count === 3) {
    return "3 张：快速测试，必须覆盖主视觉、核心卖点、购买/使用理由，三张不能重复。";
  }

  if (count === 5) {
    return "5 张：基础套图，建议覆盖主视觉、卖点、场景、细节、CTA 或规格。";
  }

  if (count === 7) {
    return "7 张：常见商品套图，建议覆盖主视觉、卖点、场景、细节、四宫格/参数、多角度/人物/材质、CTA。";
  }

  if (count === 8) {
    return "8 张：完整详情页或 Listing 结构，必须形成从吸引点击到解释卖点、展示细节、建立信任、促进转化的完整序列。";
  }

  return `${count} 张：请按照用户自定义结构规划，确保每张图片承担不同任务，避免重复同一种画面。`;
}

function buildCustomStructurePrompt(customStructure?: ProductImageSetCustomStructure | null) {
  if (!customStructure) {
    return "";
  }

  const rows: Array<[string, number]> = ([
    ["白底图", customStructure.whiteBackground],
    ["场景图", customStructure.usageScene],
    ["卖点图", customStructure.sellingPoint],
    ["细节图", customStructure.detailCloseup],
    ["尺寸/参数图", customStructure.sizeSpec],
    ["对比图", customStructure.comparison],
    ["其他", customStructure.other],
  ] as Array<[string, number | undefined]>).filter((row): row is [string, number] => typeof row[1] === "number" && row[1] > 0);

  if (!rows.length) {
    return "";
  }

  return [
    "用户选择了自定义套图结构，请严格按照以下数量规划：",
    ...rows.map(([label, value]) => `- ${label}：${value} 张`),
    "硬约束：输出 images 数量必须等于 count，每种 imageType 数量尽量严格匹配用户指定结构，不要擅自改变结构。",
    "映射建议：白底图使用 white-background；场景图使用 usage-scene 或 model-wearing；卖点图使用 selling-point；细节图使用 detail-closeup 或 four-grid-detail；尺寸/参数图使用 size-spec；对比图使用 comparison。",
    "other 可以根据商品和用途选择 hero、multi-angle、brand-story、cta、size-spec、comparison 等合适类型。",
  ].join("\n");
}

export function buildProductImageSetPlanPrompt({
  analysis,
  count,
  customStructure,
  generationBrief,
  outputSettings,
  productTitle,
  purpose,
  structureMode = "smart",
}: ProductImageSetPlanPromptInput) {
  const productName = analysis.productNameSuggestions[0] || productTitle || analysis.category || "商品";
  const categoryStrategy = getProductCategoryVisualStrategy({
    category: analysis.category,
    productName,
  });
  const generationBriefPrompt = buildProductGenerationBriefPrompt(generationBrief);
  const outputSettingsPrompt = buildProductOutputSettingsPrompt(outputSettings);

  return [
    `你是 CloudAI 的电商商品套图策划助手，请规划 ${count} 张商品图片结构。`,
    "本轮只输出套图规划，不生成图片。",
    "必须严格输出 JSON，不要输出 Markdown，不要添加解释文字。",
    "JSON 结构必须是：",
    `{
  "purpose": "${purpose}",
  "count": ${count},
  "images": [
    {
      "imageIndex": 1,
      "imageType": "hero",
      "title": "首屏主视觉",
      "goal": "传递核心价值并吸引点击",
      "headline": "...",
      "subheadline": "...",
      "keyMessage": "...",
      "visualDirection": "...",
      "requiredElements": ["..."],
      "mustKeep": ["..."],
      "avoid": ["..."],
      "suggestedGenerationMode": "faithful"
    }
  ]
}`,
    "",
    `固定用途：${purpose}。`,
    `固定数量：${count} 张。images.length 必须等于 ${count}。`,
    `结构模式：${structureMode === "custom" ? "自定义配置" : "智能匹配"}。`,
    structureMode === "custom" ? buildCustomStructurePrompt(customStructure) : "智能匹配模式：请根据商品分析、用途、数量和用户生成要求自动规划每张图类型。",
    "imageIndex 必须从 1 开始连续递增。",
    "允许 imageType：hero、white-background、selling-point、usage-scene、detail-closeup、model-wearing、multi-angle、size-spec、comparison、four-grid-detail、brand-story、cta。",
    "suggestedGenerationMode 只能是 faithful 或 creative。结构敏感、有 Logo/印花/图案/固定外观的商品优先 faithful。",
    getCountGuide(count),
    ...PURPOSE_GUIDES[purpose],
    `类目策略：${categoryStrategy.categoryKey}`,
    CATEGORY_IMAGE_SET_GUIDES[categoryStrategy.categoryKey],
    `类目保真规则：${categoryStrategy.fidelityRules.join(" ")}`,
    `类目避免事项：${categoryStrategy.avoidRules.join(" ")}`,
    generationBriefPrompt,
    outputSettingsPrompt,
    PRODUCT_GENERATION_RULES_BLOCK,
    "优先级：用户保存的「商品卖点 & 生成要求」 > 商品补充信息 productHint > 商品分析结果 > AI 合理推测。",
    "如果用户任务书中有必须保留或避免改动，每张相关图片的 mustKeep / avoid 都要体现。",
    "每张图必须承担不同作用，不要重复同一个卖点或同一种画面。",
    "不要虚构价格、销量、认证、医学功效、平台授权、品牌背书或用户未提供的参数。",
    "",
    "商品信息：",
    `商品名称：${productName}`,
    `商品类别：${analysis.category || "暂无"}`,
    `目标用户：${analysis.targetAudience || "暂无"}`,
    `核心卖点：${joinList(analysis.sellingPoints)}`,
    `商品特点：${joinList(analysis.features)}`,
    `使用场景：${joinList(analysis.scenes)}`,
    `视觉风格：${analysis.visualStyle || "暂无"}`,
    `材质/颜色：${[analysis.material, analysis.color, ...(analysis.materials || []), ...(analysis.colors || [])].filter(Boolean).join(" / ") || "暂无"}`,
    `规格/容量：${[...(analysis.specifications || []), analysis.capacity].filter(Boolean).join(" / ") || "暂无"}`,
    `必须保留：${joinList(analysis.mustKeepDetails)}`,
    `避免改动：${joinList(analysis.avoidChanges)}`,
    `风险提示：${joinList(analysis.risks)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
