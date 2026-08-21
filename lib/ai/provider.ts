import type { ProductOutputSettings } from "@/lib/product-types";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TextGenerationTask = "chat-assistant" | "copywriting" | "detail-page-plan" | "image-set-plan" | "product-copywriting";

export type GenerateAIResponseOptions = {
  jsonMode?: boolean;
  model?: string;
  outputSettings?: ProductOutputSettings | null;
  requestId?: string;
  strictProviderConfig?: boolean;
  task?: TextGenerationTask;
  temperature?: number;
};

export type AIProvider = {
  generateAIResponse: (messages: AIMessage[], options?: GenerateAIResponseOptions) => Promise<string>;
};

export type TextProviderName = "deepseek" | "openai-compatible";
type TextConfigSource = "default" | "fallback" | "global-env" | "multilingual-env" | "provider-default-env" | "task-env";

const DEEPSEEK_MODEL_ID = "deepseek-v4-pro";

type TextEnvName =
  | "CHAT_TEXT_MODEL"
  | "CHAT_TEXT_PROVIDER"
  | "COPYWRITING_TEXT_MODEL"
  | "COPYWRITING_TEXT_PROVIDER"
  | "DEEPSEEK_API_KEY"
  | "DETAIL_PAGE_PLAN_TEXT_MODEL"
  | "DETAIL_PAGE_PLAN_TEXT_PROVIDER"
  | "IMAGE_SET_PLAN_TEXT_MODEL"
  | "IMAGE_SET_PLAN_TEXT_PROVIDER"
  | "MULTILINGUAL_TEXT_MODEL"
  | "MULTILINGUAL_TEXT_PROVIDER"
  | "OPENAI_TEXT_API_KEY"
  | "OPENAI_TEXT_BASE_URL"
  | "OPENAI_TEXT_MODEL"
  | "PRODUCT_COPYWRITING_TEXT_MODEL"
  | "PRODUCT_COPYWRITING_TEXT_PROVIDER"
  | "TEXT_MODEL"
  | "TEXT_PROVIDER";

const TASK_ENV_MAP = {
  "chat-assistant": {
    model: "CHAT_TEXT_MODEL",
    provider: "CHAT_TEXT_PROVIDER",
  },
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
  outputLanguage: string;
  provider: TextProviderName;
  providerSource: TextConfigSource;
  task?: TextGenerationTask;
};

export type TextProviderErrorKind = "auth" | "configuration" | "model-not-found" | "network" | "rate-limit" | "server" | "unknown";

export class TextProviderError extends Error {
  kind: TextProviderErrorKind;
  model?: string;
  provider?: TextProviderName;
  status?: number;
  upstreamCode?: string;
  upstreamMessage?: string;
  upstreamStatus?: string;

  constructor({
    kind,
    message,
    model,
    provider,
    status,
    upstreamCode,
    upstreamMessage,
    upstreamStatus,
  }: {
    kind: TextProviderErrorKind;
    message: string;
    model?: string;
    provider?: TextProviderName;
    status?: number;
    upstreamCode?: string;
    upstreamMessage?: string;
    upstreamStatus?: string;
  }) {
    super(message);
    this.name = "TextProviderError";
    this.kind = kind;
    this.model = model;
    this.provider = provider;
    this.status = status;
    this.upstreamCode = upstreamCode;
    this.upstreamMessage = upstreamMessage;
    this.upstreamStatus = upstreamStatus;
  }
}

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
    CHAT_TEXT_MODEL: getOptionalTextEnv("CHAT_TEXT_MODEL"),
    CHAT_TEXT_PROVIDER: getOptionalTextEnv("CHAT_TEXT_PROVIDER"),
    COPYWRITING_TEXT_MODEL: getOptionalTextEnv("COPYWRITING_TEXT_MODEL"),
    COPYWRITING_TEXT_PROVIDER: getOptionalTextEnv("COPYWRITING_TEXT_PROVIDER"),
    DETAIL_PAGE_PLAN_TEXT_MODEL: getOptionalTextEnv("DETAIL_PAGE_PLAN_TEXT_MODEL"),
    DETAIL_PAGE_PLAN_TEXT_PROVIDER: getOptionalTextEnv("DETAIL_PAGE_PLAN_TEXT_PROVIDER"),
    IMAGE_SET_PLAN_TEXT_MODEL: getOptionalTextEnv("IMAGE_SET_PLAN_TEXT_MODEL"),
    IMAGE_SET_PLAN_TEXT_PROVIDER: getOptionalTextEnv("IMAGE_SET_PLAN_TEXT_PROVIDER"),
    MULTILINGUAL_TEXT_MODEL: getOptionalTextEnv("MULTILINGUAL_TEXT_MODEL"),
    MULTILINGUAL_TEXT_PROVIDER: getOptionalTextEnv("MULTILINGUAL_TEXT_PROVIDER"),
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

function getOutputLanguage(outputSettings?: ProductOutputSettings | null) {
  return outputSettings?.outputLanguage?.trim() || "zh-CN";
}

function isMultilingualTask(task?: TextGenerationTask) {
  return Boolean(task && ["copywriting", "product-copywriting", "detail-page-plan", "image-set-plan"].includes(task));
}

function getEnvHost(name: TextEnvName) {
  const value = getOptionalTextEnv(name);

  if (!value) {
    return "";
  }

  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}

function getResolvedTextProviderConfig(task?: TextGenerationTask, outputSettings?: ProductOutputSettings | null): TextProviderConfig {
  const outputLanguage = getOutputLanguage(outputSettings);
  const multilingualProvider = getOptionalTextEnv("MULTILINGUAL_TEXT_PROVIDER");
  const multilingualModel = getOptionalTextEnv("MULTILINGUAL_TEXT_MODEL");
  const shouldUseMultilingual = outputLanguage !== "zh-CN" && isMultilingualTask(task) && Boolean(multilingualProvider && multilingualModel);

  if (shouldUseMultilingual) {
    return {
      model: multilingualModel,
      modelSource: "multilingual-env",
      outputLanguage,
      provider: normalizeProviderName(multilingualProvider),
      providerSource: "multilingual-env",
      task,
    };
  }

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
    outputLanguage,
    provider,
    providerSource,
    task,
  };
}

function isOpenAICompatibleTextConfigured(model: string) {
  return Boolean(getOptionalTextEnv("OPENAI_TEXT_API_KEY") && getOptionalTextEnv("OPENAI_TEXT_BASE_URL") && model);
}

function getRunnableTextProviderConfig(
  task?: TextGenerationTask,
  outputSettings?: ProductOutputSettings | null,
  options: { strictProviderConfig?: boolean } = {},
): TextProviderConfig {
  const config = getResolvedTextProviderConfig(task, outputSettings);

  if (config.provider === "openai-compatible") {
    if (isOpenAICompatibleTextConfigured(config.model)) {
      return config;
    }

    if (options.strictProviderConfig) {
      throw new TextProviderError({
        kind: "configuration",
        message: "OpenAI-compatible text provider is not fully configured.",
        model: config.model,
        provider: config.provider,
      });
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
    outputLanguage: config.outputLanguage,
    provider: "deepseek",
    providerSource: "fallback",
    task,
  };
}

export function getTextProviderResolution(
  task?: TextGenerationTask,
  outputSettings?: ProductOutputSettings | null,
  options: { strictProviderConfig?: boolean } = {},
) {
  const config = getRunnableTextProviderConfig(task, outputSettings, options);

  return {
    ...config,
    baseUrlHost: config.provider === "openai-compatible" ? getEnvHost("OPENAI_TEXT_BASE_URL") : "api.deepseek.com",
    hasApiKey: config.provider === "openai-compatible" ? Boolean(getOptionalTextEnv("OPENAI_TEXT_API_KEY")) : Boolean(getOptionalTextEnv("DEEPSEEK_API_KEY")),
    hasBaseUrl: config.provider === "openai-compatible" ? Boolean(getOptionalTextEnv("OPENAI_TEXT_BASE_URL")) : true,
    modelId: config.provider === "openai-compatible" ? `openai-compatible:${config.model}` : config.model || DEEPSEEK_MODEL_ID,
  };
}

export function getTextProviderName(task?: TextGenerationTask): TextProviderName {
  return getRunnableTextProviderConfig(task).provider;
}

export function getTextProviderModelId(task?: TextGenerationTask, outputSettings?: ProductOutputSettings | null) {
  const config = getRunnableTextProviderConfig(task, outputSettings);

  if (config.provider === "openai-compatible") {
    return `openai-compatible:${config.model}`;
  }

  return config.model || DEEPSEEK_MODEL_ID;
}

export async function generateAIResponse(messages: AIMessage[], options?: GenerateAIResponseOptions) {
  const config = getRunnableTextProviderConfig(options?.task, options?.outputSettings, { strictProviderConfig: options?.strictProviderConfig });
  const requestId = options?.requestId || createTextRequestId();

  logTextEnvSnapshot();
  logTextDebug("[text-router] resolved model", {
    model: config.model,
    modelSource: config.modelSource,
    outputLanguage: config.outputLanguage,
    isMultilingual: config.outputLanguage !== "zh-CN" && config.providerSource === "multilingual-env" && config.modelSource === "multilingual-env",
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
  outputSettings,
  task,
  temperature,
}: {
  jsonMode?: boolean;
  messages: AIMessage[];
  outputSettings?: ProductOutputSettings | null;
  task: TextGenerationTask;
  temperature?: number;
}) {
  return generateAIResponse(messages, { jsonMode, outputSettings, task, temperature });
}
