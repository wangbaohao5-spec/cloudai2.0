import type { AIMessage, AIProvider, GenerateAIResponseOptions } from "@/lib/ai/provider";
import { getRequiredEnv } from "@/lib/server-env";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-pro";

type DeepSeekResponse = {
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

export const deepseekProvider: AIProvider = {
  async generateAIResponse(messages: AIMessage[], options: GenerateAIResponseOptions = {}) {
    const apiKey = getRequiredEnv("DEEPSEEK_API_KEY");
    const model = options.model || DEFAULT_DEEPSEEK_MODEL;

    let response: Response;

    try {
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
        endpoint: DEEPSEEK_API_URL,
        errorMessage: error instanceof Error ? error.message : String(error),
        model,
        provider: "deepseek",
      });

      throw new Error("文本生成服务暂时不可用，请稍后重试。");
    }

    const data = (await response.json().catch(() => null)) as DeepSeekResponse | null;

    if (!response.ok) {
      console.error("[deepseek-text] http error", {
        endpoint: DEEPSEEK_API_URL,
        model,
        provider: "deepseek",
        responseBody: JSON.stringify(data || {}).slice(0, 800),
        status: response.status,
        statusText: response.statusText,
      });

      throw new Error("文本生成服务暂时不可用，请稍后重试。");
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[deepseek-text] invalid response", {
        endpoint: DEEPSEEK_API_URL,
        model,
        provider: "deepseek",
      });

      throw new Error("文本生成服务暂时不可用，请稍后重试。");
    }

    return content;
  },
};

export async function generateAIResponse(messages: AIMessage[], options?: GenerateAIResponseOptions) {
  return deepseekProvider.generateAIResponse(messages, options);
}
