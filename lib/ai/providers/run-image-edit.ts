import type { ImageEditInput, ImageEditResult } from "@/lib/ai/image-edit-provider";
import { getRequiredEnv } from "@/lib/server-env";
import sharp from "sharp";
import { fetchProvider, PROVIDER_TIMEOUTS, ProviderRequestError } from "@/lib/ai/provider-http";

type RunImageEditResponse = {
  data?: Array<{
    b64Json?: string;
    b64_json?: string;
    base64?: string;
    image?: unknown;
    url?: string;
  }>;
  output?: Array<{
    b64Json?: string;
    b64_json?: string;
    base64?: string;
    image?: unknown;
    url?: string;
  }>;
  result?: {
    b64Json?: string;
    b64_json?: string;
    base64?: string;
    image?: unknown;
    url?: string;
  };
  b64Json?: string;
  b64_json?: string;
  base64?: string;
  image?: unknown;
  url?: string;
  error?: {
    code?: string | number;
    message?: string;
    status?: string | number;
  };
  message?: string;
  status?: string | number;
};

function getRunApiUrl() {
  const baseUrl = getRequiredEnv("RUN_API_BASE_URL").replace(/\/+$/, "");

  return `${baseUrl}/v1/images/edits`;
}

function getObjectKeys(value: unknown) {
  return value && typeof value === "object" ? Object.keys(value as Record<string, unknown>).slice(0, 24) : [];
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isDataImageBase64(value: string) {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}

function getCandidateImageString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const objectValue = value as Record<string, unknown>;

  return (
    getStringValue(objectValue.b64_json) ||
    getStringValue(objectValue.b64Json) ||
    getStringValue(objectValue.base64) ||
    getStringValue(objectValue.url) ||
    getCandidateImageString(objectValue.image) ||
    getCandidateImageString(objectValue.output)
  );
}

function getRunApiImageCandidate(data: RunImageEditResponse) {
  const candidates = [
    data.data?.[0]?.b64_json,
    data.data?.[0]?.b64Json,
    data.data?.[0]?.base64,
    data.data?.[0]?.image,
    data.data?.[0]?.url,
    data.output?.[0]?.b64_json,
    data.output?.[0]?.b64Json,
    data.output?.[0]?.base64,
    data.output?.[0]?.image,
    data.output?.[0]?.url,
    data.result?.b64_json,
    data.result?.b64Json,
    data.result?.base64,
    data.result?.image,
    data.result?.url,
    data.b64_json,
    data.b64Json,
    data.base64,
    data.image,
    data.url,
  ];

  for (const candidate of candidates) {
    const value = getCandidateImageString(candidate);

    if (value) {
      return value;
    }
  }

  return "";
}

function getSafeRunApiError(data: RunImageEditResponse | null) {
  return {
    code: data?.error?.code,
    message: data?.error?.message || data?.message,
    status: data?.error?.status || data?.status,
  };
}

function logRunApiDiagnostics({
  data,
  model,
  requestId,
  responseStatus,
}: {
  data: RunImageEditResponse | null;
  model: string;
  requestId?: string | null;
  responseStatus: number;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[run-image-edit] response diagnostics", {
    status: responseStatus,
    provider: "run-api",
    model,
    requestId: requestId || undefined,
    topLevelKeys: getObjectKeys(data),
    data0Keys: getObjectKeys(data?.data?.[0]),
    output0Keys: getObjectKeys(data?.output?.[0]),
    resultKeys: getObjectKeys(data?.result),
    error: getSafeRunApiError(data),
  });
}

async function readRunApiResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as RunImageEditResponse;
  } catch {
    return {
      message: text.slice(0, 280),
    } satisfies RunImageEditResponse;
  }
}

function getNormalizedFileName(fileName?: string) {
  const baseName = (fileName || "image")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${baseName || "image"}.png`;
}

async function loadNormalizedImageBlob(imageUrl: string) {
  const response = await fetchProvider(imageUrl, {}, PROVIDER_TIMEOUTS.image);

  if (!response.ok) {
    throw new Error("Failed to load source image for edit.");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const normalizedImage = await sharp(imageBuffer)
    .rotate()
    .flatten({ background: "#ffffff" })
    .toColorspace("srgb")
    .png()
    .toBuffer();

  return new Blob([new Uint8Array(normalizedImage)], {
    type: "image/png",
  });
}

async function loadResultUrlAsBase64(resultUrl: string) {
  const response = await fetchProvider(resultUrl, {}, PROVIDER_TIMEOUTS.image);

  if (!response.ok) {
    throw new Error("图片编辑服务返回了图片链接，但服务端读取失败，请稍后重试或切换模型。");
  }

  return Buffer.from(await response.arrayBuffer()).toString("base64");
}

async function normalizeRunApiImageCandidate(candidate: string) {
  if (!candidate) {
    return "";
  }

  if (isHttpUrl(candidate)) {
    return loadResultUrlAsBase64(candidate);
  }

  if (isDataImageBase64(candidate)) {
    return candidate;
  }

  return candidate;
}

export async function editImageWithRunApi(input: ImageEditInput): Promise<ImageEditResult> {
  const apiKey = getRequiredEnv("RUN_API_KEY");
  const model = input.model || "gpt-image-2";
  const imageBlob = await loadNormalizedImageBlob(input.imageUrl);
  const formData = new FormData();

  formData.append("model", model);
  formData.append("prompt", input.prompt);
  formData.append("response_format", "b64_json");
  formData.append("image", imageBlob, getNormalizedFileName(input.fileName));

  const response = await fetchProvider(getRunApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  }, PROVIDER_TIMEOUTS.image);
  const data = await readRunApiResponse(response);
  const requestId = response.headers.get("x-request-id") || response.headers.get("request-id") || response.headers.get("x-ratelimit-request-id");

  if (!response.ok) {
    logRunApiDiagnostics({
      data,
      model,
      requestId,
      responseStatus: response.status,
    });

    throw new ProviderRequestError("图片编辑服务暂时不可用，请稍后重试。", 502);
  }

  const candidate = data ? getRunApiImageCandidate(data) : "";
  const b64Json = await normalizeRunApiImageCandidate(candidate);

  if (!b64Json) {
    logRunApiDiagnostics({
      data,
      model,
      requestId,
      responseStatus: response.status,
    });

    throw new Error(
      process.env.NODE_ENV === "development"
        ? "图片编辑服务没有返回可用图片，请稍后重试或切换模型。RunAPI response did not contain b64_json or url."
        : "图片编辑服务没有返回可用图片，请稍后重试或切换模型。",
    );
  }

  return {
    b64Json,
    provider: "run-api",
    model,
  };
}
