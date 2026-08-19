import type { ProductImageAnalysis } from "@/lib/product-types";
import { PRODUCT_GENERATION_RULES_BLOCK } from "@/lib/ai/product-generation-rules";
import { getOptionalEnv } from "@/lib/server-env";

const DASHSCOPE_VISION_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const DASHSCOPE_VISION_MODEL = getOptionalEnv("DASHSCOPE_VISION_MODEL") || "qwen-vl-plus";
const PRODUCT_ANALYSIS_UNAVAILABLE_MESSAGE = "商品图片分析服务暂时不可用，请稍后重试。";
const PRODUCT_ANALYSIS_CONFIG_MESSAGE = "商品分析服务未配置，请检查 DASHSCOPE_API_KEY。";
const PRODUCT_ANALYSIS_AUTH_MESSAGE = "商品分析服务授权失败，请检查 DashScope 配置。";
const PRODUCT_ANALYSIS_RATE_LIMIT_MESSAGE = "商品分析服务请求过于频繁，请稍后再试。";

type DashScopeVisionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    code?: string;
    status?: string;
    message?: string;
    details?: unknown;
  };
};

export class DashScopeVisionError extends Error {
  status?: number;
  code?: string;
  safeDebug?: string;

  constructor(message: string, details?: { status?: number; code?: string; safeDebug?: string }) {
    super(message);
    this.name = "DashScopeVisionError";
    this.status = details?.status;
    this.code = details?.code;
    this.safeDebug = details?.safeDebug;
  }
}

function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

function getSafeEndpoint() {
  try {
    const endpoint = new URL(DASHSCOPE_VISION_API_URL);

    return {
      endpointHost: endpoint.host,
      endpointPath: endpoint.pathname,
    };
  } catch {
    return {
      endpointHost: "dashscope.aliyuncs.com",
      endpointPath: "/compatible-mode/v1/chat/completions",
    };
  }
}

function stripJsonFence(content: string) {
  return content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeStringArray(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function normalizeDetailPageHints(value: unknown): ProductImageAnalysis["detailPageHints"] {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const hints = value as NonNullable<ProductImageAnalysis["detailPageHints"]>;

  return {
    usageScenes: normalizeStringArray(hints.usageScenes),
    detailAngles: normalizeStringArray(hints.detailAngles),
    visualMood: typeof hints.visualMood === "string" && hints.visualMood.trim() ? hints.visualMood.trim() : undefined,
  };
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
    specifications: normalizeStringArray(value.specifications),
    capacity: value.capacity || undefined,
    variants: normalizeStringArray(value.variants),
    materials: normalizeStringArray(value.materials),
    colors: normalizeStringArray(value.colors),
    mustKeepDetails: normalizeStringArray(value.mustKeepDetails),
    avoidChanges: normalizeStringArray(value.avoidChanges),
    detailPageHints: normalizeDetailPageHints(value.detailPageHints),
    risks: normalizeStringArray(value.risks),
  };
}

function getErrorCauseDetails(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;

  if (!cause || typeof cause !== "object") {
    return {};
  }

  const causeRecord = cause as {
    code?: unknown;
    errno?: unknown;
    hostname?: unknown;
    message?: unknown;
    syscall?: unknown;
  };

  return {
    causeMessage: typeof causeRecord.message === "string" ? causeRecord.message : undefined,
    causeCode: typeof causeRecord.code === "string" ? causeRecord.code : undefined,
    causeErrno: typeof causeRecord.errno === "number" || typeof causeRecord.errno === "string" ? causeRecord.errno : undefined,
    causeSyscall: typeof causeRecord.syscall === "string" ? causeRecord.syscall : undefined,
    causeHostname: typeof causeRecord.hostname === "string" ? causeRecord.hostname : undefined,
  };
}

function truncateLogBody(value: unknown) {
  try {
    return JSON.stringify(value).slice(0, 1200);
  } catch {
    return "[unserializable response body]";
  }
}

function parseDashScopeError(data: DashScopeVisionResponse | null) {
  const upstreamError = data?.error;

  return {
    code: typeof upstreamError?.code === "string" ? upstreamError.code : typeof upstreamError?.status === "string" ? upstreamError.status : undefined,
    message: typeof upstreamError?.message === "string" ? upstreamError.message : undefined,
    details: upstreamError?.details,
  };
}

function getDashScopeErrorMessage(status: number) {
  if (status === 401 || status === 403) {
    return PRODUCT_ANALYSIS_AUTH_MESSAGE;
  }

  if (status === 429) {
    return PRODUCT_ANALYSIS_RATE_LIMIT_MESSAGE;
  }

  return PRODUCT_ANALYSIS_UNAVAILABLE_MESSAGE;
}

export async function analyzeDashScopeProductImage(imageUrl: string, productHint?: string): Promise<ProductImageAnalysis> {
  const apiKey = getOptionalEnv("DASHSCOPE_API_KEY");

  if (!apiKey) {
    throw new DashScopeVisionError(PRODUCT_ANALYSIS_CONFIG_MESSAGE, {
      code: "MISSING_DASHSCOPE_API_KEY",
      safeDebug: "Missing DASHSCOPE_API_KEY",
    });
  }

  const normalizedProductHint = productHint?.trim();
  let response: Response;

  if (isDevelopment()) {
    console.info("[dashscope-vision] request", {
      ...getSafeEndpoint(),
      model: DASHSCOPE_VISION_MODEL,
      hasApiKey: Boolean(apiKey),
      hasImageUrl: Boolean(imageUrl),
    });
  }

  try {
    response = await fetch(DASHSCOPE_VISION_API_URL, {
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
            content: [
              "你是专业电商商品图分析专家。分析优先级是：用户补充信息 > 图片视觉识别 > AI 合理推测。请优先参考用户提供的商品补充信息，再结合图片可见信息分析商品；如果用户补充信息与图片视觉存在冲突，优先相信用户补充信息，但不要完全忽略图片，并在 risks 中说明。用户补充信息中提到的型号、规格、容量、材质、颜色、卖点应优先进入分析结果。用户补充信息中提到必须保留的 Logo、图案、卡通元素、印花、配色、灯光、版型、布局等，必须标记为商品关键外观细节，不要当成可随意变化的背景装饰。",
              "商品分析可以识别图片中可能出现的品牌标识，但表达必须保守。例如可写“图片中可见 NY / MLB 风格标识，建议用户确认品牌与授权信息。”不得写“MLB 官方授权商品”“正版 MLB 联名款”，除非用户补充信息明确提供。",
              PRODUCT_GENERATION_RULES_BLOCK,
              "请严格返回 JSON。",
            ].join("\n\n"),
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
用户补充信息：
${normalizedProductHint || "用户未提供补充信息，请仅基于图片可见信息分析。"}

{
  "category": "商品类别",
  "productNameSuggestions": ["商品名称建议1", "商品名称建议2"],
  "features": ["图片中可见的商品特点"],
  "sellingPoints": ["适合电商表达的卖点"],
  "targetAudience": "目标用户",
  "scenes": ["使用场景"],
  "visualStyle": "图片视觉风格",
  "material": "可见或用户补充确认的材质，无法确认则为空字符串",
  "color": "主要颜色",
  "specifications": ["规格、尺寸、型号等信息；无法确认则返回空数组"],
  "capacity": "容量/净含量/件数等信息，无法确认则为空字符串",
  "materials": ["材质信息；无法确认则返回空数组"],
  "colors": ["颜色、配色、灯光颜色等信息；无法确认则返回空数组"],
  "variants": ["多款式、多颜色、多规格信息；无法确认则返回空数组"],
  "mustKeepDetails": ["用户要求必须保留的商品细节、Logo、图案、印花、配色、灯光、布局或版型"],
  "avoidChanges": ["后续生成图片时应该避免改变的商品外观或表达"],
  "detailPageHints": {
    "usageScenes": ["适合详情页展示的使用场景"],
    "detailAngles": ["适合详情页展示的细节角度"],
    "visualMood": "详情页适合延续的视觉氛围"
  },
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
  } catch (error) {
    console.error("[dashscope-vision] fetch failed", {
      ...getSafeEndpoint(),
      model: DASHSCOPE_VISION_MODEL,
      errorMessage: error instanceof Error ? error.message : String(error),
      ...getErrorCauseDetails(error),
    });

    throw new DashScopeVisionError(PRODUCT_ANALYSIS_UNAVAILABLE_MESSAGE, {
      code: "FETCH_FAILED",
      safeDebug: error instanceof Error ? error.message : "fetch failed",
    });
  }

  const data = (await response.json().catch(() => null)) as DashScopeVisionResponse | null;

  if (!response.ok) {
    const upstreamError = parseDashScopeError(data);
    const safeDebug = `DashScope Vision ${response.status} ${upstreamError.message || response.statusText}`;

    console.error("[dashscope-vision] http error", {
      ...getSafeEndpoint(),
      model: DASHSCOPE_VISION_MODEL,
      status: response.status,
      statusText: response.statusText,
      upstreamCode: upstreamError.code,
      upstreamMessage: upstreamError.message,
      upstreamDetails: isDevelopment() ? truncateLogBody(upstreamError.details) : undefined,
      responseBody: isDevelopment() ? truncateLogBody(data) : undefined,
    });

    throw new DashScopeVisionError(getDashScopeErrorMessage(response.status), {
      status: response.status,
      code: upstreamError.code,
      safeDebug,
    });
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("DashScope vision returned an empty response.");
  }

  try {
    return normalizeAnalysis(JSON.parse(stripJsonFence(content)) as Partial<ProductImageAnalysis>);
  } catch {
    throw new Error("DashScope vision returned invalid JSON.");
  }
}
