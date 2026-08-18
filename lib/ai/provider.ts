export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TextGenerationTask = "copywriting" | "detail-page-plan" | "image-set-plan" | "product-copywriting";

export type GenerateAIResponseOptions = {
  jsonMode?: boolean;
  model?: string;
  requestId?: string;
  task?: TextGenerationTask;
  temperature?: number;
};

export type AIProvider = {
  generateAIResponse: (messages: AIMessage[], options?: GenerateAIResponseOptions) => Promise<string>;
};

type TextProviderName = "deepseek" | "openai-compatible";
type TextConfigSource = "default" | "fallback" | "global-env" | "provider-default-env" | "task-env";

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
  modelSource: TextConfigSource;
  provider: TextProviderName;
  providerSource: TextConfigSource;
  task?: TextGenerationTask;
};

function getOptionalTextEnv(name: TextEnvName) {
  return process.env[name]?.trim() || "";
}

function createTextRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

function logTextEnvSnapshot() {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[text-router] env snapshot", {
    COPYWRITING_TEXT_MODEL: getOptionalTextEnv("COPYWRITING_TEXT_MODEL"),
    COPYWRITING_TEXT_PROVIDER: getOptionalTextEnv("COPYWRITING_TEXT_PROVIDER"),
    DETAIL_PAGE_PLAN_TEXT_MODEL: getOptionalTextEnv("DETAIL_PAGE_PLAN_TEXT_MODEL"),
    DETAIL_PAGE_PLAN_TEXT_PROVIDER: getOptionalTextEnv("DETAIL_PAGE_PLAN_TEXT_PROVIDER"),
    IMAGE_SET_PLAN_TEXT_MODEL: getOptionalTextEnv("IMAGE_SET_PLAN_TEXT_MODEL"),
    IMAGE_SET_PLAN_TEXT_PROVIDER: getOptionalTextEnv("IMAGE_SET_PLAN_TEXT_PROVIDER"),
    PRODUCT_COPYWRITING_TEXT_MODEL: getOptionalTextEnv("PRODUCT_COPYWRITING_TEXT_MODEL"),
    PRODUCT_COPYWRITING_TEXT_PROVIDER: getOptionalTextEnv("PRODUCT_COPYWRITING_TEXT_PROVIDER"),
    TEXT_MODEL: getOptionalTextEnv("TEXT_MODEL"),
    TEXT_PROVIDER: getOptionalTextEnv("TEXT_PROVIDER"),
  });
}

function logTextDebug(message: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(message, payload);
}

function normalizeProviderName(provider: string): TextProviderName {
  return provider.toLowerCase() === "openai-compatible" ? "openai-compatible" : "deepseek";
}

function getTaskTextEnv(task: TextGenerationTask | undefined, field: "model" | "provider") {
  return task ? getOptionalTextEnv(TASK_ENV_MAP[task][field]) : "";
}

function getResolvedTextProviderConfig(task?: TextGenerationTask): TextProviderConfig {
  const taskProvider = getTaskTextEnv(task, "provider");
  const globalProvider = getOptionalTextEnv("TEXT_PROVIDER");
  const provider = normalizeProviderName(taskProvider || globalProvider);
  const providerSource: TextConfigSource = taskProvider ? "task-env" : globalProvider ? "global-env" : "default";
  const taskModel = getTaskTextEnv(task, "model");
  const globalModel = getOptionalTextEnv("TEXT_MODEL");
  const providerDefaultModel = provider === "openai-compatible" ? getOptionalTextEnv("OPENAI_TEXT_MODEL") : "";
  const model = taskModel || globalModel || providerDefaultModel || DEEPSEEK_MODEL_ID;
  const modelSource: TextConfigSource = taskModel
    ? "task-env"
    : globalModel
      ? "global-env"
      : providerDefaultModel
        ? "provider-default-env"
        : "default";

  return {
    model,
    modelSource,
    provider,
    providerSource,
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
    modelSource: "fallback",
    provider: "deepseek",
    providerSource: "fallback",
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
  const requestId = options?.requestId || createTextRequestId();

  logTextEnvSnapshot();
  logTextDebug("[text-router] resolved model", {
    model: config.model,
    modelSource: config.modelSource,
    provider: config.provider,
    providerSource: config.providerSource,
    requestId,
    task: config.task || "default",
  });

  if (config.provider === "openai-compatible") {
    const { openAICompatibleTextProvider } = await import("@/lib/ai/providers/openai-compatible-text");

    return openAICompatibleTextProvider.generateAIResponse(messages, { ...options, model: config.model, requestId });
  }

  const { deepseekProvider } = await import("@/lib/ai/deepseek");
  return deepseekProvider.generateAIResponse(messages, { ...options, model: config.model, requestId });
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
