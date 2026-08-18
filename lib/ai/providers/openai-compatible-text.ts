import type { AIMessage, AIProvider, GenerateAIResponseOptions } from "@/lib/ai/provider";
import { getRequiredEnv } from "@/lib/server-env";

type OpenAICompatibleTextResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
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

export function getOpenAICompatibleTextModelId() {
  return getRequiredEnv("OPENAI_TEXT_MODEL");
}

export const openAICompatibleTextProvider: AIProvider = {
  async generateAIResponse(messages: AIMessage[], options: GenerateAIResponseOptions = {}) {
    const apiKey = getRequiredEnv("OPENAI_TEXT_API_KEY");
    const baseUrl = getRequiredEnv("OPENAI_TEXT_BASE_URL");
    const model = options.model || getOpenAICompatibleTextModelId();
    const endpoint = getChatCompletionsEndpoint(baseUrl);

    let response: Response;

    try {
      console.info("[openai-compatible-text] request model", {
        endpoint,
        model,
        requestId: options.requestId || "unknown",
        task: options.task || "default",
      });

      response = await fetch(endpoint, {
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
      console.error("[openai-compatible-text] fetch failed", {
        cause: getCauseSummary(error),
        endpoint,
        errorMessage: error instanceof Error ? error.message : String(error),
        model,
        provider: "openai-compatible",
      });

      throw new Error("文本生成服务暂时不可用，请稍后重试。");
    }

    const data = (await response.json().catch(() => null)) as OpenAICompatibleTextResponse | null;

    if (!response.ok) {
      console.error("[openai-compatible-text] http error", {
        endpoint,
        model,
        provider: "openai-compatible",
        responseBody: JSON.stringify(data || {}).slice(0, 800),
        status: response.status,
        statusText: response.statusText,
      });

      throw new Error("文本生成服务暂时不可用，请稍后重试。");
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[openai-compatible-text] invalid response", {
        endpoint,
        model,
        provider: "openai-compatible",
      });

      throw new Error("文本生成服务暂时不可用，请稍后重试。");
    }

    return content;
  },
};
