import { getProductCategoryVisualStrategy } from "@/lib/ai/product-category-visual-strategy";
import { ABSOLUTE_CLAIMS_RULES, BRAND_AND_AUTHORIZATION_RULES, PRODUCT_VISUAL_FIDELITY_RULES } from "@/lib/ai/product-generation-rules";
import { buildProductOutputSettingsPrompt } from "@/lib/ai/product-output-settings-prompt-builder";
import type { ProductImageAnalysis, ProductOutputSettings } from "@/lib/product-types";

export type ProductScenePromptInput = {
  analysis: ProductImageAnalysis;
  scene: string;
  platform: string;
  outputSettings?: ProductOutputSettings | null;
  style: string;
};

const platformGuides: Record<string, string> = {
  taobao: "适合淘宝电商视觉，主体清晰，转化卖点明确，适合商品详情和主图氛围延展",
  pinduoduo: "适合拼多多电商视觉，强调实用、直接、性价比和明确购买动机",
  douyin: "适合抖音电商短视频和直播带货场景，画面需要强吸引力、强情绪触发和快速理解",
  tiktok: "适合 TikTok Shop 海外短视频电商，画面具备国际化视觉吸引力，适合社交种草",
  amazon: "适合 Amazon 商品页和广告图，画面专业可信，构图干净，产品细节清晰",
  shopee: "适合 Shopee 跨境电商，画面轻快、移动端友好，突出使用场景和购买理由",
};

const styleGuides: Record<string, string> = {
  lifestyle: "生活方式场景，真实使用环境，自然光，用户能快速代入使用场景",
  premium: "高级广告视觉，精致商业摄影灯光，质感突出，品牌感强",
  social: "社交媒体种草风格，移动端封面构图，年轻化、有停留感和分享感",
  benefit: "卖点展示场景，突出商品功能、材质细节和核心利益点，画面清晰直接",
  minimal: "极简高级风格，留白充足，背景干净，商品主体突出",
};

function joinList(items?: string[]) {
  return items?.filter(Boolean).join("、") || "无明确补充";
}

export function buildProductScenePrompt({ analysis, scene, platform, outputSettings, style }: ProductScenePromptInput) {
  const productName = analysis.productNameSuggestions[0] || analysis.category || "商品";
  const platformGuide = platformGuides[platform] || "适合通用电商平台，突出商品主体、使用场景和商业转化";
  const styleGuide = styleGuides[style] || style || "高质量电商商业摄影风格";
  const materialColor = [analysis.material, analysis.color].filter(Boolean).join(" / ") || "以图片分析中可见材质和颜色为准";
  const categoryStrategy = getProductCategoryVisualStrategy({
    category: analysis.category,
    productName,
  });
  const outputSettingsPrompt = buildProductOutputSettingsPrompt(outputSettings);

  return [
    "高质量电商商品场景图",
    `商品名称：${productName}`,
    `商品类别：${analysis.category || "商品"}`,
    `可见商品特点：${joinList(analysis.features)}`,
    `核心卖点：${joinList(analysis.sellingPoints)}`,
    `目标用户：${analysis.targetAudience || "电商消费者"}`,
    `推荐使用场景：${joinList(analysis.scenes)}`,
    `用户选择营销场景：${scene}`,
    `目标平台：${platformGuide}`,
    outputSettingsPrompt,
    `视觉风格：${styleGuide}`,
    `材质和颜色参考：${materialColor}`,
    `视觉分析参考：${analysis.visualStyle || "专业电商视觉"}`,
    `类目策略：${categoryStrategy.categoryKey}`,
    `类目场景建议：${categoryStrategy.detailPageSuggestions.join(" ")}`,
    `类目保真规则：${categoryStrategy.fidelityRules.join(" ")}`,
    `类目避免事项：${categoryStrategy.avoidRules.join(" ")}`,
    PRODUCT_VISUAL_FIDELITY_RULES,
    BRAND_AND_AUTHORIZATION_RULES,
    ABSOLUTE_CLAIMS_RULES,
    "产品主体突出，商业摄影灯光，真实材质，高清细节，构图整洁，适合电商营销使用",
    "不要添加文字，不要水印，不要 logo，不要生成无法从商品分析中确认的品牌或参数",
    "这是基于商品分析结果生成的营销场景图，不是原图精确复刻",
  ].join("，");
}

export function buildProductSceneEditPrompt({ analysis, scene, platform, outputSettings, style }: ProductScenePromptInput) {
  const productName = analysis.productNameSuggestions[0] || analysis.category || "商品";
  const platformGuide = platformGuides[platform] || "适合通用电商平台，突出商品主体、使用场景和商业转化";
  const styleGuide = styleGuides[style] || style || "高质量电商商业摄影风格";
  const materialColor = [analysis.material, analysis.color].filter(Boolean).join(" / ") || "以原图可见材质和颜色为准";
  const categoryStrategy = getProductCategoryVisualStrategy({
    category: analysis.category,
    productName,
  });
  const outputSettingsPrompt = buildProductOutputSettingsPrompt(outputSettings);

  return [
    "请基于用户上传的商品图片进行电商营销场景图编辑",
    "上传图片中的商品是唯一商品主体，必须保持原商品身份一致",
    "严格保持商品结构、轮廓、Logo、品牌标识、材质、颜色、尺寸比例和关键设计细节",
    "禁止重新设计商品，禁止替换成同品类的其他商品，禁止改变商品型号、鞋型、结构、配色或标识",
    "只允许改变商品周围的背景、环境、陈列方式、光影、拍摄角度氛围和营销场景",
    `商品名称参考：${productName}`,
    `商品类别：${analysis.category || "商品"}`,
    `可见商品特点：${joinList(analysis.features)}`,
    `核心卖点：${joinList(analysis.sellingPoints)}`,
    `目标用户：${analysis.targetAudience || "电商消费者"}`,
    `推荐使用场景：${joinList(analysis.scenes)}`,
    `用户选择营销场景：${scene}`,
    `目标平台：${platformGuide}`,
    outputSettingsPrompt,
    `视觉风格：${styleGuide}`,
    `材质和颜色参考：${materialColor}`,
    `视觉分析参考：${analysis.visualStyle || "专业电商视觉"}`,
    `类目策略：${categoryStrategy.categoryKey}`,
    `类目场景建议：${categoryStrategy.detailPageSuggestions.join(" ")}`,
    `类目保真规则：${categoryStrategy.fidelityRules.join(" ")}`,
    `类目避免事项：${categoryStrategy.avoidRules.join(" ")}`,
    PRODUCT_VISUAL_FIDELITY_RULES,
    BRAND_AND_AUTHORIZATION_RULES,
    ABSOLUTE_CLAIMS_RULES,
    "生成高质量商业摄影效果，商品主体清晰突出，背景服务于营销表达，适合电商投放或上架使用",
    "不要生成文字，不要水印，不要额外 logo，不要添加不存在的功能、参数、配件或无法确认的品牌信息",
  ].join("，");
}
