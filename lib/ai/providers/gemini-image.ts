import type { ImageEditInput, ImageEditResult } from "@/lib/ai/image-edit-provider";
import { getOptionalEnv } from "@/lib/server-env";
import sharp from "sharp";

type GeminiImageResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiImagePart[];
    };
  }>;
  error?: {
    code?: number;
    details?: unknown[];
    message?: string;
    status?: string;
  };
};

type GeminiImagePart = {
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
  inline_data?: {
    data?: string;
    mime_type?: string;
  };
  text?: string;
};

const DEFAULT_GEMINI_IMAGE_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3-pro-image-preview";
const GEMINI_IMAGE_MIME_TYPE = "image/png";

class GeminiImageProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiImageProviderError";
  }
}

function getGeminiImageEndpoint(model: string) {
  const baseUrl = (getOptionalEnv("GEMINI_IMAGE_BASE_URL") || DEFAULT_GEMINI_IMAGE_BASE_URL).replace(/\/+$/, "");

  if (/\/models\/[^/]+:generateContent$/i.test(baseUrl)) {
    return baseUrl;
  }

  if (/\/models$/i.test(baseUrl)) {
    return `${baseUrl}/${encodeURIComponent(model)}:generateContent`;
  }

  const versionedBaseUrl = /\/v1(?:beta)?$/i.test(baseUrl) ? baseUrl : `${baseUrl}/v1beta`;

  return `${versionedBaseUrl}/models/${encodeURIComponent(model)}:generateContent`;
}

function getEndpointLogInfo(endpoint: string) {
  try {
    const url = new URL(endpoint);

    return {
      endpointHost: url.host,
      endpointPath: url.pathname,
    };
  } catch {
    return {
      endpointHost: "invalid-endpoint",
      endpointPath: "",
    };
  }
}

async function loadNormalizedImageBase64(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new GeminiImageProviderError("Gemini 图片模型读取源图片失败。");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const normalizedImage = await sharp(imageBuffer)
    .rotate()
    .flatten({ background: "#ffffff" })
    .toColorspace("srgb")
    .png()
    .toBuffer();

  return {
    base64: normalizedImage.toString("base64"),
    bytes: normalizedImage.byteLength,
    mimeType: GEMINI_IMAGE_MIME_TYPE,
  };
}

function getGeminiParts(data: GeminiImageResponse | null) {
  return data?.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];
}

function getGeminiImageData(data: GeminiImageResponse | null) {
  const parts = getGeminiParts(data);

  return parts.map((part) => part.inlineData?.data || part.inline_data?.data || "").find(Boolean) || "";
}

function getGeminiResponseDiagnostics(data: GeminiImageResponse | null) {
  const candidates = data?.candidates || [];
  const parts = getGeminiParts(data);
  const textParts = parts.map((part) => part.text || "").filter(Boolean);

  return {
    hasCandidates: candidates.length > 0,
    candidateCount: candidates.length,
    hasParts: parts.length > 0,
    hasInlineData: parts.some((part) => Boolean(part.inlineData?.data || part.inline_data?.data)),
    hasText: textParts.length > 0,
    textSummary: textParts.join(" ").slice(0, 300),
  };
}

function logGeminiImageRequest(input: {
  endpoint: string;
  imageBytes: number;
  imageMimeType: string;
  model: string;
  outputRatio?: string;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[gemini-image] request", {
    ...getEndpointLogInfo(input.endpoint),
    provider: "gemini-image",
    model: input.model,
    hasApiKey: Boolean(getOptionalEnv("GEMINI_IMAGE_API_KEY")),
    imageMimeType: input.imageMimeType,
    imageBytes: input.imageBytes,
    outputRatio: input.outputRatio,
  });
}

function logGeminiResponseDiagnostics(data: GeminiImageResponse | null) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[gemini-image] response diagnostics", getGeminiResponseDiagnostics(data));
}

function getSafeDetailsSummary(details: unknown) {
  if (!Array.isArray(details) || details.length === 0) {
    return undefined;
  }

  return details.slice(0, 3).map((detail) => {
    if (!detail || typeof detail !== "object") {
      return String(detail).slice(0, 160);
    }

    const record = detail as Record<string, unknown>;

    return {
      type: typeof record["@type"] === "string" ? record["@type"] : undefined,
      reason: typeof record.reason === "string" ? record.reason : undefined,
      domain: typeof record.domain === "string" ? record.domain : undefined,
    };
  });
}

function getUpstreamErrorMessage(status: number, error?: GeminiImageResponse["error"]) {
  const upstreamCode = error?.code || status;
  const upstreamStatus = error?.status || "";
  const upstreamMessage = error?.message || "";
  const suffix = [upstreamCode, upstreamStatus, upstreamMessage].filter(Boolean).join(" ");

  if (status === 401 || status === 403) {
    return `Gemini 图片模型未授权：${suffix}`;
  }

  if (status === 404) {
    return `Gemini 图片模型不存在或当前账号不可用：${suffix}`;
  }

  if (status === 429) {
    return `Gemini 图片模型限流：${suffix}`;
  }

  return `Gemini 图片模型请求失败：${suffix || status}`;
}

function parseGeminiResponseText(text: string): GeminiImageResponse | null {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as GeminiImageResponse;
  } catch {
    return null;
  }
}

export async function editImageWithGemini(input: ImageEditInput): Promise<ImageEditResult> {
  const apiKey = getOptionalEnv("GEMINI_IMAGE_API_KEY");

  if (!apiKey) {
    throw new GeminiImageProviderError("Gemini 图片模型未配置 API Key。");
  }

  const model = input.model || getOptionalEnv("GEMINI_IMAGE_MODEL") || DEFAULT_GEMINI_IMAGE_MODEL;
  const endpoint = getGeminiImageEndpoint(model);
  const image = await loadNormalizedImageBase64(input.imageUrl);

  logGeminiImageRequest({
    endpoint,
    imageBytes: image.bytes,
    imageMimeType: image.mimeType,
    model,
    outputRatio: input.outputSettings?.outputRatio,
  });

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: input.prompt,
              },
              {
                inline_data: {
                  mime_type: image.mimeType,
                  data: image.base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause && typeof error.cause === "object" ? error.cause : undefined;

    console.error("[gemini-image] fetch failed", {
      ...getEndpointLogInfo(endpoint),
      model,
      errorMessage: error instanceof Error ? error.message : String(error),
      causeCode: cause && "code" in cause ? cause.code : undefined,
      causeErrno: cause && "errno" in cause ? cause.errno : undefined,
      causeSyscall: cause && "syscall" in cause ? cause.syscall : undefined,
      causeHostname: cause && "hostname" in cause ? cause.hostname : undefined,
    });

    throw new GeminiImageProviderError("Gemini 图片服务暂时不可用，请稍后重试。");
  }

  const responseText = await response.text().catch(() => "");
  const data = parseGeminiResponseText(responseText);

  if (!response.ok) {
    console.error("[gemini-image] upstream error", {
      ...getEndpointLogInfo(endpoint),
      model,
      status: response.status,
      statusText: response.statusText,
      code: data?.error?.code,
      upstreamStatus: data?.error?.status,
      message: data?.error?.message?.slice(0, 500) || responseText.slice(0, 500),
      details: getSafeDetailsSummary(data?.error?.details),
    });

    throw new GeminiImageProviderError(getUpstreamErrorMessage(response.status, data?.error));
  }

  logGeminiResponseDiagnostics(data);

  if (!data?.candidates?.length) {
    throw new GeminiImageProviderError("Gemini 没有返回候选结果。");
  }

  const b64Json = getGeminiImageData(data);

  if (!b64Json) {
    const diagnostics = getGeminiResponseDiagnostics(data);

    if (process.env.NODE_ENV === "development" && diagnostics.textSummary) {
      console.info("[gemini-image] text-only response", {
        model,
        textSummary: diagnostics.textSummary,
      });
    }

    throw new GeminiImageProviderError("Gemini 图像模型没有返回图片。");
  }

  return {
    b64Json,
    provider: "gemini-image",
    model,
    modelId: `gemini-image:${model}`,
    outputRatio: input.outputSettings?.outputRatio,
  };
}
