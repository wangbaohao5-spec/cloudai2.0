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
    message?: string;
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

function getGeminiImageEndpoint(model: string) {
  const baseUrl = (getOptionalEnv("GEMINI_IMAGE_BASE_URL") || DEFAULT_GEMINI_IMAGE_BASE_URL).replace(/\/+$/, "");
  const versionedBaseUrl = /\/v1(?:beta)?$/i.test(baseUrl) ? baseUrl : `${baseUrl}/v1beta`;

  return `${versionedBaseUrl}/models/${encodeURIComponent(model)}:generateContent`;
}

async function loadNormalizedImageBase64(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Gemini 图片模型读取源图片失败。");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const normalizedImage = await sharp(imageBuffer)
    .rotate()
    .flatten({ background: "#ffffff" })
    .toColorspace("srgb")
    .png()
    .toBuffer();

  return normalizedImage.toString("base64");
}

function getGeminiImageData(data: GeminiImageResponse | null) {
  const parts = data?.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];

  return parts.map((part) => part.inlineData?.data || part.inline_data?.data || "").find(Boolean) || "";
}

function logGeminiImageRequest(input: { endpoint: string; model: string; outputRatio?: string }) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[gemini-image] request model", {
    endpoint: input.endpoint,
    model: input.model,
    outputRatio: input.outputRatio,
  });
}

export async function editImageWithGemini(input: ImageEditInput): Promise<ImageEditResult> {
  const apiKey = getOptionalEnv("GEMINI_IMAGE_API_KEY");

  if (!apiKey) {
    throw new Error("Gemini 图片模型未配置 API Key。");
  }

  const model = input.model || getOptionalEnv("GEMINI_IMAGE_MODEL") || DEFAULT_GEMINI_IMAGE_MODEL;
  const endpoint = getGeminiImageEndpoint(model);
  const imageBase64 = await loadNormalizedImageBase64(input.imageUrl);

  logGeminiImageRequest({
    endpoint,
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
                  mime_type: "image/png",
                  data: imageBase64,
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
      endpoint,
      model,
      errorMessage: error instanceof Error ? error.message : String(error),
      causeCode: cause && "code" in cause ? cause.code : undefined,
      causeErrno: cause && "errno" in cause ? cause.errno : undefined,
      causeSyscall: cause && "syscall" in cause ? cause.syscall : undefined,
      causeHostname: cause && "hostname" in cause ? cause.hostname : undefined,
    });

    throw new Error("Gemini 图片服务暂时不可用，请稍后重试。");
  }

  const data = (await response.json().catch(() => null)) as GeminiImageResponse | null;

  if (!response.ok) {
    console.error("[gemini-image] upstream error", {
      endpoint,
      model,
      status: response.status,
      statusText: response.statusText,
      message: data?.error?.message?.slice(0, 500),
    });

    throw new Error("Gemini 图片服务暂时不可用，请稍后重试。");
  }

  const b64Json = getGeminiImageData(data);

  if (!b64Json) {
    throw new Error("Gemini 图像模型没有返回图片。");
  }

  return {
    b64Json,
    provider: "gemini-image",
    model,
    modelId: `gemini-image:${model}`,
    outputRatio: input.outputSettings?.outputRatio,
  };
}
