import type { ImageEditInput, ImageEditResult } from "@/lib/ai/image-edit-provider";
import {
  classifyProviderHttpStatus,
  createProviderDiagnostic,
  logProviderDiagnostic,
  type ProviderDiagnosticStage,
} from "@/lib/ai/provider-observability";
import { fetchProvider, PROVIDER_TIMEOUTS, ProviderRequestError } from "@/lib/ai/provider-http";
import { getRequiredEnv } from "@/lib/server-env";
import sharp from "sharp";

type RunImageEditResponse = {
  data?: Array<Record<string, unknown>>;
  output?: Array<Record<string, unknown>>;
  result?: Record<string, unknown>;
  b64Json?: string;
  b64_json?: string;
  base64?: string;
  image?: unknown;
  url?: string;
};

function getRunApiUrl() {
  return `${getRequiredEnv("RUN_API_BASE_URL").replace(/\/+$/, "")}/v1/images/edits`;
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
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const objectValue = value as Record<string, unknown>;

  return (
    getStringValue(objectValue.b64_json) || getStringValue(objectValue.b64Json) ||
    getStringValue(objectValue.base64) || getStringValue(objectValue.url) ||
    getCandidateImageString(objectValue.image) || getCandidateImageString(objectValue.output)
  );
}

function getRunApiImageCandidate(data: RunImageEditResponse) {
  const candidates = [data.data?.[0], data.output?.[0], data.result, data.b64_json, data.b64Json, data.base64, data.image, data.url];
  for (const candidate of candidates) {
    const value = getCandidateImageString(candidate);
    if (value) return value;
  }
  return "";
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

type DiagnosticEmitter = (
  stage: ProviderDiagnosticStage,
  options?: {
    elapsedMs?: number;
    error?: unknown;
    errorClass?: string;
    event?: "provider-stage" | "provider-failure";
    host?: string;
    status?: number;
    timeoutSource?: "abort-signal" | "provider" | "transport";
  },
) => void;

async function loadNormalizedImageBlob(imageUrl: string, emit: DiagnosticEmitter) {
  const sourceStartedAt = performance.now();
  const sourceHost = new URL(imageUrl).host;
  emit("SOURCE_FETCH_START", { host: sourceHost });
  let response: Response;

  try {
    response = await fetchProvider(imageUrl, {}, PROVIDER_TIMEOUTS.image);
  } catch (error) {
    emit("SOURCE_FETCH_START", { elapsedMs: performance.now() - sourceStartedAt, error, event: "provider-failure", host: sourceHost });
    throw error;
  }

  if (!response.ok) {
    emit("SOURCE_FETCH_END", { elapsedMs: performance.now() - sourceStartedAt, event: "provider-failure", host: sourceHost, status: response.status });
    throw new Error("Failed to load source image for edit.");
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    emit("SOURCE_FETCH_END", { elapsedMs: performance.now() - sourceStartedAt, error, event: "provider-failure", host: sourceHost, status: response.status });
    throw error;
  }
  emit("SOURCE_FETCH_END", { elapsedMs: performance.now() - sourceStartedAt, host: sourceHost, status: response.status });
  const normalizeStartedAt = performance.now();
  let normalizedImage: Buffer;
  try {
    normalizedImage = await sharp(imageBuffer).rotate().flatten({ background: "#ffffff" }).toColorspace("srgb").png().toBuffer();
  } catch (error) {
    emit("SOURCE_NORMALIZE_END", { elapsedMs: performance.now() - normalizeStartedAt, error, event: "provider-failure", host: sourceHost });
    throw error;
  }
  emit("SOURCE_NORMALIZE_END", { elapsedMs: performance.now() - normalizeStartedAt, host: sourceHost });

  return {
    blob: new Blob([new Uint8Array(normalizedImage)], { type: "image/png" }),
    byteSize: normalizedImage.byteLength,
  };
}

async function loadResultUrlAsBase64(resultUrl: string) {
  const response = await fetchProvider(resultUrl, {}, PROVIDER_TIMEOUTS.image);
  if (!response.ok) throw new Error("图片编辑服务返回了图片链接，但服务端读取失败，请稍后重试或切换模型。");
  return Buffer.from(await response.arrayBuffer()).toString("base64");
}

async function normalizeRunApiImageCandidate(candidate: string) {
  if (!candidate) return "";
  if (isHttpUrl(candidate)) return loadResultUrlAsBase64(candidate);
  if (isDataImageBase64(candidate)) return candidate;
  return candidate;
}

export async function editImageWithRunApi(input: ImageEditInput): Promise<ImageEditResult> {
  const apiKey = getRequiredEnv("RUN_API_KEY");
  const model = input.model || "gpt-image-2";
  const apiUrl = getRunApiUrl();
  const providerHost = new URL(apiUrl).host;
  const totalStartedAt = performance.now();
  const diagnosticState: { normalizedSourceBytes?: number } = {};
  const emit: DiagnosticEmitter = (stage, options = {}) => {
    logProviderDiagnostic(createProviderDiagnostic({
      context: input.diagnosticContext,
      elapsedMs: options.elapsedMs || 0,
      error: options.error,
      errorClass: options.errorClass,
      event: options.event,
      host: options.host || providerHost,
      normalizedSourceBytes: diagnosticState.normalizedSourceBytes,
      provider: "run-api",
      stage,
      status: options.status,
      task: input.task || "image-edit",
      timeoutSource: options.timeoutSource,
      totalElapsedMs: performance.now() - totalStartedAt,
    }));
  };

  const normalized = await loadNormalizedImageBlob(input.imageUrl, emit);
  diagnosticState.normalizedSourceBytes = normalized.byteSize;
  const formData = new FormData();
  formData.append("model", model);
  formData.append("prompt", input.prompt);
  formData.append("response_format", "b64_json");
  formData.append("image", normalized.blob, getNormalizedFileName(input.fileName));
  emit("MULTIPART_BUILD_END");

  const fetchStartedAt = performance.now();
  emit("PROVIDER_FETCH_START");
  let response: Response;
  try {
    response = await fetchProvider(apiUrl, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: formData }, PROVIDER_TIMEOUTS.image);
  } catch (error) {
    emit("PROVIDER_FETCH_START", {
      elapsedMs: performance.now() - fetchStartedAt,
      error,
      event: "provider-failure",
      timeoutSource: error instanceof Error && error.name === "ProviderTimeoutError" ? "abort-signal" : "transport",
    });
    throw error;
  }
  emit("PROVIDER_HEADERS_RECEIVED", { elapsedMs: performance.now() - fetchStartedAt, status: response.status });

  const bodyStartedAt = performance.now();
  let responseText: string;
  try {
    responseText = await response.text();
  } catch (error) {
    emit("PROVIDER_BODY_RECEIVED", { elapsedMs: performance.now() - bodyStartedAt, error, event: "provider-failure", status: response.status, timeoutSource: "transport" });
    throw new ProviderRequestError("图片编辑服务暂时不可用，请稍后重试。", 502, error);
  }
  emit("PROVIDER_BODY_RECEIVED", { elapsedMs: performance.now() - bodyStartedAt, status: response.status });

  let data: RunImageEditResponse | null = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText) as RunImageEditResponse;
    } catch (error) {
      if (response.ok) {
        emit("PROVIDER_RESPONSE_PARSED", { error, event: "provider-failure", status: response.status });
        throw new ProviderRequestError("图片编辑服务返回格式异常，请稍后重试。", 502, error);
      }
    }
  }
  emit("PROVIDER_RESPONSE_PARSED", { status: response.status });

  if (!response.ok) {
    emit("OUTPUT_VALIDATION", {
      errorClass: classifyProviderHttpStatus(response.status),
      event: "provider-failure",
      status: response.status,
      timeoutSource: response.status === 504 ? "provider" : undefined,
    });
    throw new ProviderRequestError("图片编辑服务暂时不可用，请稍后重试。", 502);
  }

  const candidate = data ? getRunApiImageCandidate(data) : "";
  let b64Json: string;
  try {
    b64Json = await normalizeRunApiImageCandidate(candidate);
  } catch (error) {
    emit("OUTPUT_VALIDATION", { error, event: "provider-failure", status: response.status });
    throw error;
  }

  if (!b64Json) {
    emit("OUTPUT_VALIDATION", { errorClass: "MISSING_IMAGE_OUTPUT", event: "provider-failure", status: response.status });
    throw new Error("图片编辑服务没有返回可用图片，请稍后重试或切换模型。");
  }
  emit("OUTPUT_VALIDATION", { status: response.status });

  return { b64Json, provider: "run-api", model };
}
