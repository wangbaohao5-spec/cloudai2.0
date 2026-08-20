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
  bag: "包包：首张可优先考虑人物携带场景、通勤搭配或生活方式主图；突出包型、材质、大小感和背法；必须保留包型、五金、颜色、Logo、纹理、肩带/提手结构。",
  skincare: "护肤品：适合 hero、selling-point、detail-closeup（水感/泡沫/质地）、usage-scene、brand-story/信任氛围、cta；必须保留瓶型、包装、Logo、容量信息和瓶盖结构。",
  clothing: "服装：适合 model-wearing、detail-closeup、size-spec、usage-scene、面料/领口/袖口/下摆细节；必须保留颜色、版型、印花位置和面料质感。",
  jewelry: "首饰：适合 detail-closeup、佩戴效果 usage-scene、four-grid-detail、礼物/生活方式场景；必须保留珠子数量印象、颜色、点缀位置、吊坠形状和材质。",
  keyboard: "键盘/电子产品：适合 hero、桌搭 usage-scene、detail-closeup、four-grid-detail、size-spec/连接细节；结构敏感，必须保留键位布局、键帽字符、灯光颜色、图案位置和线材位置。",
  shoes: "鞋：适合 hero、multi-angle、鞋底/鞋面 detail-closeup、outfit/usage-scene、舒适卖点图；必须保留鞋型、鞋底结构、Logo 和配色。",
  cup: "杯子：适合 hero、usage-scene、杯盖/杯口 detail-closeup、multi-color、便携/防漏细节、cta；必须保留杯型、杯盖、手柄、材质和图案。",
  general: "通用商品：根据商品卖点选择 hero、selling-point、usage-scene、detail-closeup、four-grid-detail、size-spec、brand-story、cta。",
} satisfies Record<ReturnType<typeof getProductCategoryVisualStrategy>["categoryKey"], string>;

const HERO_PLATFORM_STRATEGY = [
  "首屏主视觉 / 主图点击图定义：商品套图中的第 1 张图负责让用户第一眼理解商品是什么，并产生点击兴趣，不是普通展示图。",
  "第 1 张图片必须围绕商品主体和最重要的 1 个点击理由规划，画面比普通展示图更有吸引力，但不能牺牲商品保真。",
  "第 1 张 imageType 必须优先使用 hero；如果发布平台或自定义结构更适合，也可使用 white-background、model-wearing 或 usage-scene，但 title/goal/keyMessage/visualDirection 必须明确它是主图点击图。",
  "第 1 张 title 建议使用“首屏主视觉”“主图点击图”或“商品主图”；goal 必须包含“吸引点击，并在第一眼展示商品核心价值”；keyMessage 只提炼 1 个最重要点击理由。",
  "主图不要堆砌文字，不要生成无关元素，不要自动生成官方授权、正品保证、第一、最好、100%、永久、医学功效、平台认证或未确认品牌关系。",
  "淘宝 / 京东 / 拼多多：主体明确、商品占比高、卖点清楚，可适当加入电商主图式短卖点，但不要过度杂乱。",
  "小红书：更偏生活方式、种草感和场景感，画面自然、有氛围，文案轻，不要像硬广。",
  "抖音电商 / TikTok Shop：更强调吸引眼球、卖点直接、画面有冲击力，适合人物场景或使用场景。",
  "Amazon / Shopee / 独立站：更干净、清楚、可信，商品主体完整，白底 / 场景 / 细节组合清楚，文案克制不夸张。",
  "通用电商：商品清楚、核心卖点明确，画面简洁但有吸引力。",
].join("\n");

const HERO_CATEGORY_STRATEGY = [
  "类目主图策略：",
  "- 服装：首张可优先考虑模特穿搭图、上身场景图或搭配主视觉；重点展示版型、颜色、面料和穿着氛围；不要改变衣服颜色、图案、Logo、版型、袖口、领口、纽扣。",
  "- 包包：首张可优先考虑人物携带场景、通勤搭配或生活方式主图；重点展示包型、材质、大小感和背法；不要改变包型、五金、颜色、Logo、纹理。",
  "- 首饰：首张可优先考虑佩戴场景、手部或颈部近景、材质质感主图；重点展示材质、光泽、尺寸感和佩戴效果；不要改变珠子数量、颜色、吊坠、特殊点缀。",
  "- 数码外设：首张优先考虑干净主图或桌面场景；重点展示外观、结构、灯效、接口和核心功能；不要改变键位布局、Logo、颜色、结构、屏幕内容。",
  "- 护肤品：首张优先考虑干净主图、质地展示、水感/温和氛围；不要改变瓶身、包装、Logo、容量、文字位置。",
  "- 通用商品：主体完整、卖点明确，背景辅助但不喧宾夺主。",
].join("\n");

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
    HERO_PLATFORM_STRATEGY,
    HERO_CATEGORY_STRATEGY,
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
