import type { ProductImageAnalysis } from "@/lib/product-types";
import { getOptionalEnv, getRequiredEnv } from "@/lib/server-env";

const DASHSCOPE_VISION_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const DASHSCOPE_VISION_MODEL = getOptionalEnv("DASHSCOPE_VISION_MODEL") || "qwen-vl-plus";

type DashScopeVisionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function stripJsonFence(content: string) {
  return content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeAnalysis(value: Partial<ProductImageAnalysis>): ProductImageAnalysis {
  return {
    category: value.category || "未识别品类",
    productNameSuggestions: normalizeStringArray(value.productNameSuggestions),
    features: normalizeStringArray(value.features),
    sellingPoints: normalizeStringArray(value.sellingPoints),
    targetAudience: value.targetAudience || "待补充目标用户",
    scenes: normalizeStringArray(value.scenes),
    visualStyle: value.visualStyle || "待补充视觉风格",
    material: value.material || undefined,
    color: value.color || undefined,
    risks: normalizeStringArray(value.risks),
  };
}

export async function analyzeDashScopeProductImage(imageUrl: string): Promise<ProductImageAnalysis> {
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");
  const response = await fetch(DASHSCOPE_VISION_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DASHSCOPE_VISION_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你是专业电商商品图分析专家。你只能基于图片可见信息分析商品，不要编造容量、续航、认证、价格等图片中无法确认的参数。请严格返回 JSON。",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
            {
              type: "text",
              text: `请分析这张商品图片，并只返回 JSON，不要 Markdown。JSON 字段必须为：
{
  "category": "商品类别",
  "productNameSuggestions": ["商品名称建议1", "商品名称建议2"],
  "features": ["图片中可见的商品特点"],
  "sellingPoints": ["适合电商表达的卖点"],
  "targetAudience": "目标用户",
  "scenes": ["使用场景"],
  "visualStyle": "图片视觉风格",
  "material": "可见或可推测材质，无法确认则为空字符串",
  "color": "主要颜色",
  "risks": ["图片无法确认的信息或需要用户补充的信息"]
}`,
            },
          ],
        },
      ],
      temperature: 0.2,
      response_format: {
        type: "json_object",
      },
    }),
  });
  const data = (await response.json()) as DashScopeVisionResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "DashScope vision request failed.");
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("DashScope vision returned an empty response.");
  }

  try {
    return normalizeAnalysis(JSON.parse(stripJsonFence(content)) as Partial<ProductImageAnalysis>);
  } catch {
    throw new Error("DashScope vision returned invalid JSON.");
  }
}
