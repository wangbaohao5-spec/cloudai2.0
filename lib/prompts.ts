import type { CopywritingFormData } from "@/lib/types";
import { getPlatformPromptGuide, getPromptTemplate, getPromptTemplates } from "@/lib/prompt-templates";

export const COPYWRITING_SYSTEM_PROMPT = "你是专业电商运营专家。";

export const CHAT_SYSTEM_PROMPT = `
你是一名专业 AI 电商运营助手。

能力：
- 商品定位
- 标题优化
- 卖点分析
- 短视频脚本建议
- 平台运营建议
`.trim();

const goalPromptGuides: Record<string, string> = {
  "search-ranking": "商品目标：提升搜索排名。文案需要强化平台搜索关键词、品类词、核心属性词和用户高频搜索表达。",
  "click-through-rate": "商品目标：提升点击率。文案需要强化好奇心、场景冲突、利益前置和更强的标题吸引力。",
  conversion: "商品目标：提升转化。文案需要强化信任、购买理由、使用场景、风险降低和明确行动号召。",
  "short-video-selling": "商品目标：短视频带货。文案需要强化前三秒钩子、痛点放大、画面感、口播节奏和下单引导。",
};

function getGoalPromptGuide(goal?: string) {
  return goal ? goalPromptGuides[goal] || "商品目标：按通用电商转化目标优化。" : "商品目标：按通用电商转化目标优化。";
}

export function buildCopywritingPrompt(data: CopywritingFormData) {
  const outputTypes = data.generationMode === "marketing-plan" ? ["marketing-plan"] : data.outputTypes?.length ? data.outputTypes : [data.outputType];
  const templates = data.generationMode === "marketing-plan" ? [getPromptTemplate(data.platform, "marketing-plan")] : getPromptTemplates(data.platform, outputTypes);

  return `
请根据以下商品信息生成电商文案：

商品名称：${data.productName}
商品类型：${data.productType}
核心卖点：${data.sellingPoints}
目标平台：${data.platform}
文案风格：${data.tone}
商品目标：${data.goal || "conversion"}
生成模式：${data.generationMode || "single"}
生成类型：${outputTypes.join(", ")}

平台文案策略：
${getPlatformPromptGuide(data.platform)}

商品目标策略：
${getGoalPromptGuide(data.goal)}

当前 Prompt 模板：
${templates
  .map(
    (template) => `
模板名称：${template.name}
模板说明：${template.description}
模板要求：${template.prompt}`,
  )
  .join("\n")}

要求：
- 商品标题
- 核心卖点
- 商品详情
- 短视频口播
- 如果当前模板是广告推广文案，请在 description 中体现广告正文的痛点、利益、信任背书和行动号召
- 如果当前模式是一键生成营销方案，请综合生成完整营销方案，但仍严格填充 title、points、description、shortVideoScript 四个字段

请只返回 JSON，不要输出 Markdown 或额外解释。JSON 字段必须包含：
{
  "title": "商品标题",
  "points": ["核心卖点1", "核心卖点2", "核心卖点3"],
  "description": "商品详情",
  "shortVideoScript": "短视频口播"
}
`.trim();
}
