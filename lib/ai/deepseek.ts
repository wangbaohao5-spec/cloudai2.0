import type { AIMessage, AIProvider, GenerateAIResponseOptions } from "@/lib/ai/provider";
import { getRequiredEnv } from "@/lib/server-env";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-pro";

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

export const deepseekProvider: AIProvider = {
  async generateAIResponse(messages: AIMessage[], options: GenerateAIResponseOptions = {}) {
    const apiKey = getRequiredEnv("DEEPSEEK_API_KEY");

    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        temperature: options.temperature ?? 0.7,
        response_format: options.jsonMode ? { type: "json_object" } : undefined,
      }),
    });

    const data = (await response.json()) as DeepSeekResponse;

    if (!response.ok) {
      throw new Error(data.error?.message || "DeepSeek API request failed.");
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek API returned an empty response.");
    }

    return content;
  },
};

export async function generateAIResponse(messages: AIMessage[], options?: GenerateAIResponseOptions) {
  return deepseekProvider.generateAIResponse(messages, options);
}
