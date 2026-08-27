import { TextProviderError, type AIMessage, type AIProvider, type GenerateAIResponseOptions } from "@/lib/ai/provider";
import { fetchProvider, PROVIDER_TIMEOUTS, ProviderTimeoutError } from "@/lib/ai/provider-http";
import { getOptionalEnv } from "@/lib/server-env";

type OpenAICompatibleTextResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    code?: string;
    message?: string;
    status?: string;
    type?: string;
  };
};

function getCauseSummary(error: unknown) {
  const cause = error instanceof Error && error.cause && typeof error.cause === "object" ? (error.cause as Record<string, unknown>) : null;

  if (!cause) {
    return undefined;
  }

  return {
    code: typeof cause.code === "string" ? cause.code : undefined,
    errno: typeof cause.errno === "number" || typeof cause.errno === "string" ? cause.errno : undefined,
    hostname: typeof cause.hostname === "string" ? cause.hostname : undefined,
    syscall: typeof cause.syscall === "string" ? cause.syscall : undefined,
  };
}

function getChatCompletionsEndpoint(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function getEndpointHost(baseUrl: string) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return "invalid-url";
  }
}

function logTextDebug(message: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(message, payload);
}

export function getOpenAICompatibleTextModelId() {
  const model = getOptionalEnv("OPENAI_TEXT_MODEL");

  if (!model) {
    throw new TextProviderError({
      kind: "configuration",
      message: "Missing required server environment variable: OPENAI_TEXT_MODEL.",
      provider: "openai-compatible",
    });
  }

  return model;
}

function getUpstreamErrorKind(status: number, message?: string) {
  if (status === 401 || status === 403) {
    return "auth";
  }

  if (status === 404 || /model.+not found|not found|不存在|不可用/i.test(message || "")) {
    return "model-not-found";
  }

  if (status === 429) {
    return "rate-limit";
  }

  if (status >= 500) {
    return "server";
  }

  return "unknown";
}

export const openAICompatibleTextProvider: AIProvider = {
  async generateAIResponse(messages: AIMessage[], options: GenerateAIResponseOptions = {}) {
    const apiKey = getOptionalEnv("OPENAI_TEXT_API_KEY");
    const baseUrl = getOptionalEnv("OPENAI_TEXT_BASE_URL");
    const model = options.model || getOpenAICompatibleTextModelId();

    if (!apiKey || !baseUrl || !model) {
      throw new TextProviderError({
        kind: "configuration",
        message: "OpenAI-compatible text provider is not fully configured.",
        model,
        provider: "openai-compatible",
      });
    }

    const endpoint = getChatCompletionsEndpoint(baseUrl);
    const endpointHost = getEndpointHost(baseUrl);

    let response: Response;

    try {
      logTextDebug("[openai-compatible-text] request model", {
        endpointHost,
        model,
        requestId: options.requestId || "unknown",
        task: options.task || "default",
      });

      response = await fetchProvider(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          response_format: options.jsonMode ? { type: "json_object" } : undefined,
        }),
      }, PROVIDER_TIMEOUTS.text);
    } catch (error) {
      console.error("[openai-compatible-text] fetch failed", {
        cause: getCauseSummary(error),
        endpointHost,
        errorMessage: error instanceof Error ? error.message : String(error),
        model,
        provider: "openai-compatible",
      });

      throw new TextProviderError({
        kind: error instanceof ProviderTimeoutError ? "timeout" : "network",
        message: error instanceof ProviderTimeoutError ? error.message : "OpenAI-compatible text provider network request failed.",
        model,
        provider: "openai-compatible",
        status: 502,
        upstreamMessage: error instanceof Error ? error.message : String(error),
      });
    }

    const data = (await response.json().catch(() => null)) as OpenAICompatibleTextResponse | null;

    if (!response.ok) {
      console.error("[openai-compatible-text] http error", {
        endpointHost,
        errorCode: data?.error?.code,
        errorMessage: process.env.NODE_ENV === "development" ? data?.error?.message : undefined,
        errorStatus: data?.error?.status || data?.error?.type,
        model,
        provider: "openai-compatible",
        status: response.status,
        statusText: response.statusText,
      });

      throw new TextProviderError({
        kind: getUpstreamErrorKind(response.status, data?.error?.message),
        message: `OpenAI-compatible text provider upstream failed: ${response.status} ${data?.error?.status || data?.error?.type || response.statusText}`,
        model,
        provider: "openai-compatible",
        status: response.status,
        upstreamCode: data?.error?.code,
        upstreamMessage: data?.error?.message,
        upstreamStatus: data?.error?.status || data?.error?.type || response.statusText,
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[openai-compatible-text] invalid response", {
        endpointHost,
        model,
        provider: "openai-compatible",
      });

      throw new TextProviderError({
        kind: "unknown",
        message: "OpenAI-compatible text provider returned an empty response.",
        model,
        provider: "openai-compatible",
        status: 502,
      });
    }

    return content;
  },
};
