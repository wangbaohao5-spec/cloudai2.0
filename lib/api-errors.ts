import { NextResponse } from "next/server";
import { ProviderRequestError } from "@/lib/ai/provider-http";
import { TextProviderError } from "@/lib/ai/provider";

const UNKNOWN_ERROR_MESSAGE = "服务器暂时无法处理请求，请稍后重试。";

export class ApiError extends Error {
  status: number;
  headers?: HeadersInit;

  constructor(message: string, status: number, headers?: HeadersInit) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.headers = headers;
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function jsonError(error: unknown, fallback: string, status = 500) {
  const apiError = error instanceof ApiError ? error : null;
  const providerError = error instanceof ProviderRequestError ? error : null;
  const textProviderError = error instanceof TextProviderError ? error : null;
  const responseStatus = apiError?.status || providerError?.status || (textProviderError ? getTextProviderStatus(textProviderError) : status);
  const message = apiError?.message || providerError?.message || (textProviderError ? getTextProviderMessage(textProviderError, fallback) : status >= 500 ? UNKNOWN_ERROR_MESSAGE : fallback);

  if (!apiError && !providerError && !textProviderError) {
    console.error("[api] unhandled error", {
      errorName: error instanceof Error ? error.name : typeof error,
      status: responseStatus,
    });
  }

  return NextResponse.json(
    {
      error: message,
    },
    {
      status: responseStatus,
      headers: apiError?.headers,
    },
  );
}

function getTextProviderStatus(error: TextProviderError) {
  if (error.kind === "timeout") return 504;
  if (error.kind === "rate-limit") return 429;
  if (error.kind === "auth" || error.kind === "configuration") return 502;
  if (error.kind === "model-not-found") return 502;
  return 502;
}

function getTextProviderMessage(error: TextProviderError, fallback: string) {
  if (error.kind === "timeout") return "生成服务响应超时，请稍后重试。";
  if (error.kind === "rate-limit") return "生成服务请求过于频繁，请稍后重试。";
  return fallback || "生成服务暂时不可用，请稍后重试。";
}

export async function settleTask<T>(task: Promise<T>) {
  try {
    return {
      data: await task,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(error, "Operation failed."),
    };
  }
}
