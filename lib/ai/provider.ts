export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateAIResponseOptions = {
  jsonMode?: boolean;
  temperature?: number;
};

export type AIProvider = {
  generateAIResponse: (messages: AIMessage[], options?: GenerateAIResponseOptions) => Promise<string>;
};

type TextProviderName = "deepseek" | "openai-compatible";

const DEEPSEEK_MODEL_ID = "deepseek-v4-pro";

function getOptionalTextEnv(name: "OPENAI_TEXT_API_KEY" | "OPENAI_TEXT_BASE_URL" | "OPENAI_TEXT_MODEL" | "TEXT_PROVIDER") {
  return process.env[name]?.trim() || "";
}

function isOpenAICompatibleTextConfigured() {
  return Boolean(getOptionalTextEnv("OPENAI_TEXT_API_KEY") && getOptionalTextEnv("OPENAI_TEXT_BASE_URL") && getOptionalTextEnv("OPENAI_TEXT_MODEL"));
}

export function getTextProviderName(): TextProviderName {
  const provider = getOptionalTextEnv("TEXT_PROVIDER").toLowerCase();

  if (provider === "openai-compatible") {
    if (isOpenAICompatibleTextConfigured()) {
      return "openai-compatible";
    }

    console.error("[text-router] openai-compatible text provider is not fully configured; falling back to deepseek", {
      hasApiKey: Boolean(getOptionalTextEnv("OPENAI_TEXT_API_KEY")),
      hasBaseUrl: Boolean(getOptionalTextEnv("OPENAI_TEXT_BASE_URL")),
      hasModel: Boolean(getOptionalTextEnv("OPENAI_TEXT_MODEL")),
      provider,
    });
  }

  return "deepseek";
}

export function getTextProviderModelId() {
  if (getTextProviderName() === "openai-compatible") {
    return `openai-compatible:${getOptionalTextEnv("OPENAI_TEXT_MODEL")}`;
  }

  return DEEPSEEK_MODEL_ID;
}

export async function generateAIResponse(messages: AIMessage[], options?: GenerateAIResponseOptions) {
  if (getTextProviderName() === "openai-compatible") {
    const { openAICompatibleTextProvider } = await import("@/lib/ai/providers/openai-compatible-text");

    return openAICompatibleTextProvider.generateAIResponse(messages, options);
  }

  const { deepseekProvider } = await import("@/lib/ai/deepseek");
  return deepseekProvider.generateAIResponse(messages, options);
}
