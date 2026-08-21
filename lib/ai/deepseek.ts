import { TextProviderError, type AIMessage, type AIProvider, type GenerateAIResponseOptions } from "@/lib/ai/provider";
import { getOptionalEnv } from "@/lib/server-env";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-pro";

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    code?: string;
    message?: string;
    status?: string;
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

function logTextDebug(message: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(message, payload);
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

export const deepseekProvider: AIProvider = {
  async generateAIResponse(messages: AIMessage[], options: GenerateAIResponseOptions = {}) {
    const model = options.model || DEFAULT_DEEPSEEK_MODEL;
    const apiKey = getOptionalEnv("DEEPSEEK_API_KEY");

    if (!apiKey) {
      throw new TextProviderError({
        kind: "configuration",
        message: "Missing required server environment variable: DEEPSEEK_API_KEY.",
        model,
        provider: "deepseek",
      });
    }

    let response: Response;

    try {
      logTextDebug("[deepseek] request model", {
        model,
        requestId: options.requestId || "unknown",
        task: options.task || "default",
      });

      response = await fetch(DEEPSEEK_API_URL, {
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
      });
    } catch (error) {
      console.error("[deepseek-text] fetch failed", {
        cause: getCauseSummary(error),
        errorMessage: error instanceof Error ? error.message : String(error),
        endpointHost: "api.deepseek.com",
        model,
        provider: "deepseek",
      });

      throw new TextProviderError({
        kind: "network",
        message: "DeepSeek text provider network request failed.",
        model,
        provider: "deepseek",
        status: 502,
        upstreamMessage: error instanceof Error ? error.message : String(error),
      });
    }

    const data = (await response.json().catch(() => null)) as DeepSeekResponse | null;

    if (!response.ok) {
      console.error("[deepseek-text] http error", {
        errorCode: data?.error?.code,
        errorMessage: data?.error?.message,
        errorStatus: data?.error?.status,
        endpointHost: "api.deepseek.com",
        model,
        provider: "deepseek",
        status: response.status,
        statusText: response.statusText,
      });

      throw new TextProviderError({
        kind: getUpstreamErrorKind(response.status, data?.error?.message),
        message: `DeepSeek text provider upstream failed: ${response.status} ${data?.error?.status || response.statusText}`,
        model,
        provider: "deepseek",
        status: response.status,
        upstreamCode: data?.error?.code,
        upstreamMessage: data?.error?.message,
        upstreamStatus: data?.error?.status || response.statusText,
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[deepseek-text] invalid response", {
        endpoint: DEEPSEEK_API_URL,
        model,
        provider: "deepseek",
      });

      throw new TextProviderError({
        kind: "unknown",
        message: "DeepSeek text provider returned an empty response.",
        model,
        provider: "deepseek",
        status: 502,
      });
    }

    return content;
  },
};

export async function generateAIResponse(messages: AIMessage[], options?: GenerateAIResponseOptions) {
  return deepseekProvider.generateAIResponse(messages, options);
}
