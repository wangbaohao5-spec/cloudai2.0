type EnvName =
  | "AUTH_SECRET"
  | "CHAT_TEXT_MODEL"
  | "CHAT_TEXT_PROVIDER"
  | "COPYWRITING_TEXT_MODEL"
  | "COPYWRITING_TEXT_PROVIDER"
  | "DATABASE_URL"
  | "DEEPSEEK_API_KEY"
  | "DETAIL_PAGE_PLAN_TEXT_MODEL"
  | "DETAIL_PAGE_PLAN_TEXT_PROVIDER"
  | "DETAIL_PAGE_IMAGE_MODEL"
  | "DETAIL_PAGE_IMAGE_PROVIDER"
  | "DASHSCOPE_API_KEY"
  | "DASHSCOPE_VISION_MODEL"
  | "DASHSCOPE_VIDEO_MODEL"
  | "GEMINI_IMAGE_API_KEY"
  | "GEMINI_IMAGE_BASE_URL"
  | "GEMINI_IMAGE_MODEL"
  | "IMAGE_EDIT_MODEL"
  | "IMAGE_EDIT_PROVIDER"
  | "IMAGE_SET_IMAGE_MODEL"
  | "IMAGE_SET_IMAGE_PROVIDER"
  | "IMAGE_SET_PLAN_TEXT_MODEL"
  | "IMAGE_SET_PLAN_TEXT_PROVIDER"
  | "MULTILINGUAL_TEXT_MODEL"
  | "MULTILINGUAL_TEXT_PROVIDER"
  | "OPENAI_TEXT_API_KEY"
  | "OPENAI_TEXT_BASE_URL"
  | "OPENAI_TEXT_MODEL"
  | "PRODUCT_COPYWRITING_TEXT_MODEL"
  | "PRODUCT_COPYWRITING_TEXT_PROVIDER"
  | "PRODUCT_IMAGE_EDIT_MODEL"
  | "PRODUCT_IMAGE_EDIT_PROVIDER"
  | "RUN_API_KEY"
  | "RUN_API_BASE_URL"
  | "SCENE_IMAGE_MODEL"
  | "SCENE_IMAGE_PROVIDER"
  | "SUPABASE_URL"
  | "TEXT_MODEL"
  | "TEXT_PROVIDER"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

type EnvSource = Record<string, string | undefined>;

export function getOptionalEnv(name: EnvName) {
  const value = process.env[name]?.trim();

  return value || undefined;
}

export function getRequiredEnv(name: EnvName) {
  const value = getOptionalEnv(name);

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}.`);
  }

  return value;
}

export function getPrismaDatabaseUrl() {
  return getRequiredEnv("DATABASE_URL");
}

export function getSupabaseUrl() {
  return getOptionalEnv("SUPABASE_URL") || getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function assertProductionServerEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing = getMissingProductionEnv(process.env);

  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}.`);
  }
}

const TEXT_TASK_PROVIDER_ENV = [
  "CHAT_TEXT_PROVIDER",
  "COPYWRITING_TEXT_PROVIDER",
  "PRODUCT_COPYWRITING_TEXT_PROVIDER",
  "DETAIL_PAGE_PLAN_TEXT_PROVIDER",
  "IMAGE_SET_PLAN_TEXT_PROVIDER",
] as const;

const IMAGE_EDIT_TASK_PROVIDER_ENV = [
  "IMAGE_EDIT_PROVIDER",
  "PRODUCT_IMAGE_EDIT_PROVIDER",
  "SCENE_IMAGE_PROVIDER",
  "DETAIL_PAGE_IMAGE_PROVIDER",
  "IMAGE_SET_IMAGE_PROVIDER",
] as const;

function hasEnv(env: EnvSource, name: string) {
  return Boolean(env[name]?.trim());
}

function addMissing(missing: Set<string>, env: EnvSource, names: string[]) {
  for (const name of names) {
    if (!hasEnv(env, name)) missing.add(name);
  }
}

export function getMissingProductionEnv(env: EnvSource) {
  const missing = new Set<string>();
  addMissing(missing, env, ["AUTH_SECRET", "DATABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

  if (!hasEnv(env, "SUPABASE_URL") && !hasEnv(env, "NEXT_PUBLIC_SUPABASE_URL")) {
    missing.add("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }

  // Product analysis and the current image-generation route both use DashScope.
  addMissing(missing, env, ["DASHSCOPE_API_KEY"]);

  for (const providerEnv of TEXT_TASK_PROVIDER_ENV) {
    const provider = env[providerEnv]?.trim() || env.TEXT_PROVIDER?.trim() || "deepseek";
    if (provider === "openai-compatible") {
      addMissing(missing, env, ["OPENAI_TEXT_API_KEY", "OPENAI_TEXT_BASE_URL"]);
      const taskModelEnv = providerEnv.replace("_PROVIDER", "_MODEL");
      if (!hasEnv(env, taskModelEnv) && !hasEnv(env, "TEXT_MODEL") && !hasEnv(env, "OPENAI_TEXT_MODEL")) {
        missing.add(`${taskModelEnv} or TEXT_MODEL or OPENAI_TEXT_MODEL`);
      }
    } else {
      addMissing(missing, env, ["DEEPSEEK_API_KEY"]);
    }
  }

  if (hasEnv(env, "MULTILINGUAL_TEXT_PROVIDER") || hasEnv(env, "MULTILINGUAL_TEXT_MODEL")) {
    addMissing(missing, env, ["MULTILINGUAL_TEXT_PROVIDER", "MULTILINGUAL_TEXT_MODEL"]);
    if (env.MULTILINGUAL_TEXT_PROVIDER?.trim() === "openai-compatible") {
      addMissing(missing, env, ["OPENAI_TEXT_API_KEY", "OPENAI_TEXT_BASE_URL"]);
    } else {
      addMissing(missing, env, ["DEEPSEEK_API_KEY"]);
    }
  }

  for (const providerEnv of IMAGE_EDIT_TASK_PROVIDER_ENV) {
    const provider = env[providerEnv]?.trim() || env.IMAGE_EDIT_PROVIDER?.trim() || "run-api";
    if (provider === "gemini-image") {
      addMissing(missing, env, ["GEMINI_IMAGE_API_KEY"]);
    } else if (provider === "run-api") {
      addMissing(missing, env, ["RUN_API_KEY", "RUN_API_BASE_URL"]);
    }
  }

  return Array.from(missing).sort();
}
