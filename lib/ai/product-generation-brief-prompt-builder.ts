import { sanitizeProductGenerationBrief } from "@/lib/product-generation-brief";
import type { ProductGenerationBrief } from "@/lib/product-types";

function formatList(label: string, items: string[]) {
  return items.length ? `${label}：${items.map((item) => `\n- ${item}`).join("")}` : "";
}

export function buildProductGenerationBriefPrompt(brief?: ProductGenerationBrief | null) {
  const cleanBrief = sanitizeProductGenerationBrief(brief);

  if (!cleanBrief) {
    return "";
  }

  return [
    "用户保存的「商品卖点 & 生成要求」：",
    "优先级：用户保存的「商品卖点 & 生成要求」 > 用户补充信息 productHint > 商品分析结果 > AI 合理推测。",
    "必须优先参考用户确认过的商品名称、卖点、目标用户、风格要求、必须保留和避免改动内容。",
    "不要虚构任务书中没有的信息；如果任务书与商品分析略有冲突，以任务书为主，但不要忽略原商品图。",
    cleanBrief.productName ? `用户确认商品名称：${cleanBrief.productName}` : "",
    formatList("用户确认核心卖点", cleanBrief.coreSellingPoints),
    cleanBrief.targetAudience ? `用户确认目标用户：${cleanBrief.targetAudience}` : "",
    formatList("用户确认使用场景", cleanBrief.usageScenarios),
    cleanBrief.styleRequirements ? `用户确认风格要求：${cleanBrief.styleRequirements}` : "",
    formatList("用户确认必须保留", cleanBrief.mustKeepDetails),
    formatList("用户确认避免改动", cleanBrief.avoidChanges),
    cleanBrief.extraRequirements ? `用户补充要求：${cleanBrief.extraRequirements}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
