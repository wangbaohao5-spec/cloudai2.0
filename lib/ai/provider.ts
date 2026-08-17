export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TextGenerationTask = "copywriting" | "detail-page-plan" | "image-set-plan" | "product-copywriting";

export type GenerateAIResponseOptions = {
  jsonMode?: boolean;
  model?: string;
  task?: TextGenerationTask;
  temperature?: number;
};

export type AIProvider = {
  generateAIResponse: (messages: AIMessage[], options?: GenerateAIResponseOptions) => Promise<string>;
};

type TextProviderName = "deepseek" | "openai-compatible";

const DEEPSEEK_MODEL_ID = "deepseek-v4-pro";

type TextEnvName =
  | "COPYWRITING_TEXT_MODEL"
  | "COPYWRITING_TEXT_PROVIDER"
  | "DETAIL_PAGE_PLAN_TEXT_MODEL"
  | "DETAIL_PAGE_PLAN_TEXT_PROVIDER"
  | "IMAGE_SET_PLAN_TEXT_MODEL"
  | "IMAGE_SET_PLAN_TEXT_PROVIDER"
  | "OPENAI_TEXT_API_KEY"
  | "OPENAI_TEXT_BASE_URL"
  | "OPENAI_TEXT_MODEL"
  | "PRODUCT_COPYWRITING_TEXT_MODEL"
  | "PRODUCT_COPYWRITING_TEXT_PROVIDER"
  | "TEXT_MODEL"
  | "TEXT_PROVIDER";

const TASK_ENV_MAP = {
  copywriting: {
    model: "COPYWRITING_TEXT_MODEL",
    provider: "COPYWRITING_TEXT_PROVIDER",
  },
  "detail-page-plan": {
    model: "DETAIL_PAGE_PLAN_TEXT_MODEL",
    provider: "DETAIL_PAGE_PLAN_TEXT_PROVIDER",
  },
  "image-set-plan": {
    model: "IMAGE_SET_PLAN_TEXT_MODEL",
    provider: "IMAGE_SET_PLAN_TEXT_PROVIDER",
  },
  "product-copywriting": {
    model: "PRODUCT_COPYWRITING_TEXT_MODEL",
    provider: "PRODUCT_COPYWRITING_TEXT_PROVIDER",
  },
} satisfies Record<TextGenerationTask, { model: TextEnvName; provider: TextEnvName }>;

type TextProviderConfig = {
  model: string;
  provider: TextProviderName;
  task?: TextGenerationTask;
};

function getOptionalTextEnv(name: TextEnvName) {
  return process.env[name]?.trim() || "";
}

function normalizeProviderName(provider: string): TextProviderName {
  return provider.toLowerCase() === "openai-compatible" ? "openai-compatible" : "deepseek";
}

function getTaskTextEnv(task: TextGenerationTask | undefined, field: "model" | "provider") {
  return task ? getOptionalTextEnv(TASK_ENV_MAP[task][field]) : "";
}

function getResolvedTextProviderConfig(task?: TextGenerationTask): TextProviderConfig {
  const provider = normalizeProviderName(getTaskTextEnv(task, "provider") || getOptionalTextEnv("TEXT_PROVIDER"));
  const configuredModel = getTaskTextEnv(task, "model") || getOptionalTextEnv("TEXT_MODEL");
  const model = configuredModel || (provider === "openai-compatible" ? getOptionalTextEnv("OPENAI_TEXT_MODEL") : DEEPSEEK_MODEL_ID);

  return {
    model,
    provider,
    task,
  };
}

function isOpenAICompatibleTextConfigured(model: string) {
  return Boolean(getOptionalTextEnv("OPENAI_TEXT_API_KEY") && getOptionalTextEnv("OPENAI_TEXT_BASE_URL") && model);
}

function getRunnableTextProviderConfig(task?: TextGenerationTask): TextProviderConfig {
  const config = getResolvedTextProviderConfig(task);

  if (config.provider === "openai-compatible") {
    if (isOpenAICompatibleTextConfigured(config.model)) {
      return config;
    }

    console.error("[text-router] openai-compatible text provider is not fully configured; falling back to deepseek", {
      hasApiKey: Boolean(getOptionalTextEnv("OPENAI_TEXT_API_KEY")),
      hasBaseUrl: Boolean(getOptionalTextEnv("OPENAI_TEXT_BASE_URL")),
      hasModel: Boolean(config.model),
      provider: config.provider,
      task,
    });
  }

  return {
    model: DEEPSEEK_MODEL_ID,
    provider: "deepseek",
    task,
  };
}

export function getTextProviderName(task?: TextGenerationTask): TextProviderName {
  return getRunnableTextProviderConfig(task).provider;
}

export function getTextProviderModelId(task?: TextGenerationTask) {
  const config = getRunnableTextProviderConfig(task);

  if (config.provider === "openai-compatible") {
    return `openai-compatible:${config.model}`;
  }

  return config.model || DEEPSEEK_MODEL_ID;
}

export async function generateAIResponse(messages: AIMessage[], options?: GenerateAIResponseOptions) {
  const config = getRunnableTextProviderConfig(options?.task);

  console.info("[text-router] selected text provider", {
    model: config.model,
    provider: config.provider,
    task: config.task || "default",
  });

  if (config.provider === "openai-compatible") {
    const { openAICompatibleTextProvider } = await import("@/lib/ai/providers/openai-compatible-text");

    return openAICompatibleTextProvider.generateAIResponse(messages, { ...options, model: config.model });
  }

  const { deepseekProvider } = await import("@/lib/ai/deepseek");
  return deepseekProvider.generateAIResponse(messages, { ...options, model: config.model });
}

export async function generateText({
  jsonMode,
  messages,
  task,
  temperature,
}: {
  jsonMode?: boolean;
  messages: AIMessage[];
  task: TextGenerationTask;
  temperature?: number;
}) {
  return generateAIResponse(messages, { jsonMode, task, temperature });
}
