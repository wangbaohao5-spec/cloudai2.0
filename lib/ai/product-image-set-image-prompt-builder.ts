import { getProductCategoryVisualStrategy } from "@/lib/ai/product-category-visual-strategy";
import { buildProductGenerationBriefPrompt } from "@/lib/ai/product-generation-brief-prompt-builder";
import { ABSOLUTE_CLAIMS_RULES, BRAND_AND_AUTHORIZATION_RULES, PRODUCT_VISUAL_FIDELITY_RULES } from "@/lib/ai/product-generation-rules";
import { buildProductOutputSettingsPrompt } from "@/lib/ai/product-output-settings-prompt-builder";
import type { ProductImageSetPlanImage, ProductImageSetPurpose } from "@/lib/ai/product-image-set-plan-prompt-builder";
import { buildProductVisualFidelityPrompt } from "@/lib/ai/product-visual-fidelity-prompt-builder";
import type { ProductGenerationBrief, ProductImageAnalysis, ProductOutputSettings, ProductVisualGenerationMode } from "@/lib/product-types";

type ProductImageSetImagePromptInput = {
  analysis: ProductImageAnalysis;
  generationBrief?: ProductGenerationBrief | null;
  generationMode: ProductVisualGenerationMode;
  image: ProductImageSetPlanImage;
  outputSettings?: ProductOutputSettings | null;
  productTitle: string;
  purpose: ProductImageSetPurpose;
};

const PURPOSE_VISUAL_GUIDES = {
  "quick-listing": "快速上架套图：画面应清楚、可信、适合商品上架后台或基础详情页，优先让商品主体和卖点一眼可读。",
  "detail-page": "详情页套图：画面应像电商详情页中的一个单屏模块，有明确标题、卖点、商品主体和转化逻辑。",
  "social-seeding": "社媒种草套图：画面可以更生活化、更有真实使用氛围，但不要牺牲商品主体准确性。",
  "platform-listing": "平台 Listing 套图：画面应更规范、信息清晰、适合 Amazon / Shopee / TikTok Shop 等平台商品图。",
} satisfies Record<ProductImageSetPurpose, string>;

const IMAGE_TYPE_VISUAL_GUIDES: Record<ProductImageSetPlanImage["imageType"], string> = {
  "brand-story": "Create a brand mood / style image that communicates product personality and aesthetic direction. Do not invent brand history, awards, certifications, or unauthorized claims.",
  comparison: "Create a comparison-style marketing image using only verified product benefits. Do not invent competitor products, quantified results, or exaggerated before-after effects.",
  cta: "Create a final conversion image that summarizes the buying reason with concise text and a clean product hero composition.",
  "detail-closeup": "Create a close-up detail image that highlights material, craftsmanship, structure, texture, printed detail, or a key local feature.",
  "four-grid-detail": "Create one 2x2 detail collage image. Each grid should show a different verified product detail with very short labels.",
  hero: "Create a first-screen hero image that highlights the product's core value and makes the product the clear visual center.",
  "model-wearing": "If appropriate for the category, show a real wearing / using effect with a human model. Preserve the product style, shape, pattern, size impression, and fit.",
  "multi-angle": "Show multiple angles of the same exact product. Do not create different styles, colors, variants, or redesigned versions.",
  "selling-point": "Create a concise selling-point marketing image around one core benefit. Use short text and a clear supporting visual idea.",
  "size-spec": "Show size, specification, structure, capacity, or component information only when available from the analysis or brief. Do not invent exact numbers.",
  "usage-scene": "Show a realistic usage scene. Background, people, and props may support the scene but must not cover or change the product.",
  "white-background": "Use a clean white or light background. The product should be clear, centered, and suitable as a listing image. Avoid complex scenes or decorative clutter.",
};

const HERO_CLICK_IMAGE_PROMPT = [
  "首屏主视觉 / 主图点击图专项要求：",
  "这张图是商品套图的首屏主视觉 / 主图点击图，它的任务不是普通展示，而是提升用户第一眼点击兴趣。",
  "请突出商品主体和核心卖点，画面要适合当前发布平台，让用户第一眼知道商品是什么、为什么值得点开。",
  "主图只使用 1 个最重要的点击理由，不堆砌过多文字，不生成无关元素。",
  "保持商品外观保真，不要重新设计商品，不要改变颜色、Logo、图案、版型、材质、结构、比例或关键装饰。",
  "不要添加未经用户确认的官方授权、正品保证、认证、第一、最好、100%、永久、医学功效、平台认证、未确认品牌关系或夸张功效表述。",
  "如果是服装、包包、首饰类商品，允许生成模特穿搭、佩戴或搭配场景，但必须保持商品本身的颜色、结构、材质和关键细节不变。",
].join("\n");

function joinList(items?: string[]) {
  return items?.filter(Boolean).join("、") || "暂无明确要求";
}

export function buildProductImageSetImagePrompt({
  analysis,
  generationBrief,
  generationMode,
  image,
  outputSettings,
  productTitle,
  purpose,
}: ProductImageSetImagePromptInput) {
  const productName = analysis.productNameSuggestions[0] || productTitle || analysis.category || "商品";
  const categoryStrategy = getProductCategoryVisualStrategy({
    category: analysis.category,
    productName,
  });
  const outputSettingsPrompt = buildProductOutputSettingsPrompt(outputSettings);
  const isHeroImage = image.imageIndex === 1 || image.imageType === "hero";

  return [
    "请基于用户上传的原商品图，生成一张商品套图图片。",
    "上传图片中的商品是唯一商品主体，最终图片必须仍然看起来是同一件商品。",
    "不要替换成同品类其他商品，不要重新设计商品，不要改变商品核心结构、颜色、图案、Logo、材质、比例和关键细节。",
    "只允许优化背景、构图、光线、版式、氛围和电商呈现。",
    PRODUCT_VISUAL_FIDELITY_RULES,
    BRAND_AND_AUTHORIZATION_RULES,
    ABSOLUTE_CLAIMS_RULES,
    "",
    `商品名称：${productName}`,
    `商品类别：${analysis.category || "商品"}`,
    `目标用户：${analysis.targetAudience || "电商消费者"}`,
    `核心卖点：${joinList(analysis.sellingPoints)}`,
    `商品特点：${joinList(analysis.features)}`,
    `使用场景：${joinList(analysis.scenes)}`,
    `材质/颜色：${[analysis.material, analysis.color, ...(analysis.materials || []), ...(analysis.colors || [])].filter(Boolean).join(" / ") || "以原商品图为准"}`,
    `规格/容量：${[...(analysis.specifications || []), analysis.capacity].filter(Boolean).join(" / ") || "暂无明确参数"}`,
    "",
    `套图用途：${purpose}`,
    PURPOSE_VISUAL_GUIDES[purpose],
    `当前图片：第 ${image.imageIndex} 张`,
    `图片类型：${image.imageType}`,
    `图片标题：${image.title}`,
    `图片目标：${image.goal}`,
    `主标题：${image.headline}`,
    `副标题：${image.subheadline || "无"}`,
    `核心信息：${image.keyMessage}`,
    `画面建议：${image.visualDirection}`,
    `必要元素：${joinList(image.requiredElements)}`,
    `必须保留：${joinList(image.mustKeep)}`,
    `避免改动：${joinList(image.avoid)}`,
    "",
    `图片类型专项要求：${IMAGE_TYPE_VISUAL_GUIDES[image.imageType]}`,
    isHeroImage ? HERO_CLICK_IMAGE_PROMPT : "",
    outputSettingsPrompt,
    `类目策略：${categoryStrategy.categoryKey}`,
    `类目视觉建议：${categoryStrategy.detailPageSuggestions.join(" ")}`,
    buildProductGenerationBriefPrompt(generationBrief),
    buildProductVisualFidelityPrompt({
      analysis,
      generationMode,
    }),
    "",
    "画面文字要求：",
    "可以使用少量中文大标题、短副标题或短标签，但不要生成长段正文。",
    "文字应短、清晰、适合电商图；AI 生成图中文字可能需要人工检查。",
    "不要虚构价格、销量、认证、平台授权、医学功效、竞品对比或用户没有提供的参数。",
    "不要添加水印，不要添加额外 logo，不要生成与商品无关的促销标签。",
  ]
    .filter(Boolean)
    .join("\n");
}
