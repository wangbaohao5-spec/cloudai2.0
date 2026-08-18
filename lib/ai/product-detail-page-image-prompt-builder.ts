import { getProductCategoryVisualStrategy } from "@/lib/ai/product-category-visual-strategy";
import { buildProductGenerationBriefPrompt } from "@/lib/ai/product-generation-brief-prompt-builder";
import { ABSOLUTE_CLAIMS_RULES, BRAND_AND_AUTHORIZATION_RULES, PRODUCT_VISUAL_FIDELITY_RULES } from "@/lib/ai/product-generation-rules";
import type { ProductDetailPagePlanPage, ProductDetailPageStyle } from "@/lib/ai/product-detail-page-plan-prompt-builder";
import type { ProductGenerationBrief, ProductImageAnalysis } from "@/lib/product-types";

type ProductDetailPageImagePromptInput = {
  analysis: ProductImageAnalysis;
  generationBrief?: ProductGenerationBrief | null;
  page: ProductDetailPagePlanPage;
  productTitle: string;
  style: ProductDetailPageStyle;
};

const STYLE_GUIDES = {
  ecommerce: "电商详情页视觉：信息层级清晰，转化导向明确，适合商品详情页长图中的单屏模块。",
  xiaohongshu: "小红书种草视觉：自然真实、轻内容感、有使用氛围，但仍保持商品主体专业清晰。",
  "brand-site": "品牌官网视觉：质感高级，强调品牌价值、可信度和干净的版式秩序。",
  minimal: "极简高级视觉：留白充足，文字少，构图克制，突出商品质感和核心卖点。",
} satisfies Record<ProductDetailPageStyle, string>;

function joinList(items?: string[]) {
  return items?.filter(Boolean).join("、") || "暂无明确结果";
}

const SECTION_VISUAL_GUIDES: Partial<Record<ProductDetailPagePlanPage["sectionType"], string>> = {
  comparison: "Use a clear comparison-style layout, only comparing verified features or benefits from the analysis. Do not invent competitor claims.",
  "detail-closeup": "Create a close-up detail view that highlights one important product part, texture, structure, or design detail.",
  "flat-lay": "Use a clean flat-lay composition that shows the product shape, color, pattern, and styling context clearly.",
  "four-grid-detail": "Create a 2x2 detail collage within one image, showing four verified product details without changing the product design.",
  "material-detail": "Highlight material texture, surface finish, fabric/metal/wood/plastic feel, or product texture in a premium close-up.",
  "model-wearing": "Show a model wearing or using the product when appropriate for the category, while keeping the product appearance accurate.",
  "multi-color": "Show color or variant information only if variants/colors are available in the analysis. Do not invent unavailable colors.",
  "selling-point": "Create a strong selling-point visual with one clear benefit and a concise supporting visual metaphor.",
  specification: "Present verified specifications, structure, size, capacity, or component details in a clean product-detail layout.",
  trust: "Create a trust-building visual using verified quality cues only. Do not invent certifications, awards, medical claims, or platform authorization.",
  "usage-scene": "Create a realistic usage scene that shows how the product fits into the user's life or work context.",
};

export function buildProductDetailPageImagePrompt({ analysis, generationBrief, page, productTitle, style }: ProductDetailPageImagePromptInput) {
  const productName = analysis.productNameSuggestions[0] || productTitle || analysis.category || "商品";
  const materialColor = [analysis.material, analysis.color].filter(Boolean).join(" / ") || "以原商品图可见材质和颜色为准";
  const generationBriefPrompt = buildProductGenerationBriefPrompt(generationBrief);
  const categoryStrategy = getProductCategoryVisualStrategy({
    category: analysis.category,
    productName,
  });

  return [
    "请基于用户上传的原商品图，生成一张电商商品详情页图片。",
    "上传图片中的商品是唯一商品主体，必须保持原商品身份一致。",
    "严格保持商品结构、轮廓、Logo、品牌标识、材质、颜色、尺寸比例和关键设计细节。",
    "禁止重新设计商品，禁止替换成同品类的其他商品，禁止改变商品型号、形态、结构、配色或标识。",
    "只允许调整商品周围的背景、版式、光影、装饰元素、信息排版和详情页视觉氛围。",
    PRODUCT_VISUAL_FIDELITY_RULES,
    BRAND_AND_AUTHORIZATION_RULES,
    ABSOLUTE_CLAIMS_RULES,
    "",
    `商品名称：${productName}`,
    `商品类别：${analysis.category || "商品"}`,
    `目标用户：${analysis.targetAudience || "电商消费者"}`,
    `核心卖点：${joinList(analysis.sellingPoints)}`,
    `商品特点：${joinList(analysis.features)}`,
    `材质和颜色参考：${materialColor}`,
    `视觉风格参考：${analysis.visualStyle || "专业电商视觉"}`,
    `详情页风格：${STYLE_GUIDES[style]}`,
    `类目策略：${categoryStrategy.categoryKey}`,
    `类目详情页建议：${categoryStrategy.detailPageSuggestions.join(" ")}`,
    `当前页面类型视觉要求：${SECTION_VISUAL_GUIDES[page.sectionType] || "根据当前页面标题和卖点生成清晰、专业的详情页单屏视觉。"}`,
    generationBriefPrompt,
    "",
    "当前要生成的详情页规划：",
    `第 ${page.pageIndex} 张：${page.sectionTitle}`,
    `页面类型：${page.sectionType}`,
    `标题：${page.headline}`,
    `副标题：${page.subheadline}`,
    `核心卖点：${page.sellingPoint}`,
    `画面建议：${page.visualDirection}`,
    `文案参考：${page.bodyCopy}`,
    page.notes ? `备注：${page.notes}` : "",
    "",
    "画面要求：",
    "生成适合电商详情页使用的单张视觉图，构图清晰，商品主体突出，信息层级明确。",
    "允许少量大标题和短副标题出现在画面中，但不要生成长段正文。",
    "bodyCopy 只作为布局和内容参考，不要求完整出现在图中。",
    "中文文字可能不稳定，因此画面文字必须短、清晰、少量。",
    "不要虚构商品参数、认证、价格、销量、品牌授权、医学功效或无法从商品分析确认的信息。",
    "不要添加水印，不要添加额外 logo，不要生成与商品无关的促销标签。",
    "AI 生成图中文字可能需要人工检查。",
  ]
    .filter(Boolean)
    .join("\n");
}
