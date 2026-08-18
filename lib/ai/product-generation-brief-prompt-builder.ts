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
    cleanBrief.riskConfirmations?.confirmedBrandClaims ? `用户明确确认可使用的品牌/授权/认证信息：${cleanBrief.riskConfirmations.confirmedBrandClaims}` : "",
    cleanBrief.riskConfirmations?.forbiddenClaims ? `用户明确禁止生成的表述：${cleanBrief.riskConfirmations.forbiddenClaims}` : "",
    cleanBrief.riskConfirmations?.complianceNotes ? `用户其它合规/真实性备注：${cleanBrief.riskConfirmations.complianceNotes}` : "",
    cleanBrief.riskConfirmations
      ? "风险信息优先级：用户确认的品牌/授权信息 > 用户禁止生成的表述 > 统一 Generation Rules > AI 合理推测。即使用户提供了可使用的授权或认证信息，也只能使用用户明确写出的内容，不得扩展为正品保证、官方旗舰、平台认证、国家认证或其它未提供背书。"
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
