import { BRAND_AND_AUTHORIZATION_RULES, PRODUCT_VISUAL_FIDELITY_RULES } from "@/lib/ai/product-generation-rules";
import { getProductImageEditGoal, type ProductImageEditGoalId } from "@/lib/product-image-edit-options";

type ProductImageEditPromptInput = {
  goalId: ProductImageEditGoalId;
  userPrompt?: string;
};

const PRODUCT_PRESERVATION_RULES =
  "商品保持规则：保持商品主体一致，不改变商品颜色、结构、尺寸比例，不添加不存在的功能，不生成文字、水印、额外 logo 或无法确认的品牌信息。";

export function buildProductImageEditPrompt({ goalId, userPrompt }: ProductImageEditPromptInput) {
  const goal = getProductImageEditGoal(goalId);
  const extraPrompt = userPrompt?.trim();

  return [goal.promptTemplate, PRODUCT_PRESERVATION_RULES, PRODUCT_VISUAL_FIDELITY_RULES, BRAND_AND_AUTHORIZATION_RULES, extraPrompt ? `用户额外要求：${extraPrompt}` : ""]
    .filter(Boolean)
    .join("\n\n");
}
