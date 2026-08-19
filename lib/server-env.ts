type EnvName =
  | "AUTH_SECRET"
  | "COPYWRITING_TEXT_MODEL"
  | "COPYWRITING_TEXT_PROVIDER"
  | "DATABASE_URL"
  | "DEEPSEEK_API_KEY"
  | "DETAIL_PAGE_PLAN_TEXT_MODEL"
  | "DETAIL_PAGE_PLAN_TEXT_PROVIDER"
  | "DASHSCOPE_API_KEY"
  | "DASHSCOPE_VISION_MODEL"
  | "DASHSCOPE_VIDEO_MODEL"
  | "IMAGE_SET_PLAN_TEXT_MODEL"
  | "IMAGE_SET_PLAN_TEXT_PROVIDER"
  | "MULTILINGUAL_TEXT_MODEL"
  | "MULTILINGUAL_TEXT_PROVIDER"
  | "OPENAI_TEXT_API_KEY"
  | "OPENAI_TEXT_BASE_URL"
  | "OPENAI_TEXT_MODEL"
  | "PRODUCT_COPYWRITING_TEXT_MODEL"
  | "PRODUCT_COPYWRITING_TEXT_PROVIDER"
  | "RUN_API_KEY"
  | "RUN_API_BASE_URL"
  | "SUPABASE_URL"
  | "TEXT_MODEL"
  | "TEXT_PROVIDER"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

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

function appendConnectionParam(databaseUrl: string, key: string, value: string) {
  if (databaseUrl.includes(`${key}=`)) {
    return databaseUrl;
  }

  const separator = databaseUrl.includes("?") ? "&" : "?";

  return `${databaseUrl}${separator}${key}=${value}`;
}

export function getPrismaDatabaseUrl() {
  let databaseUrl = getRequiredEnv("DATABASE_URL");

  if (databaseUrl.includes("pooler.supabase.com")) {
    databaseUrl = appendConnectionParam(databaseUrl, "pgbouncer", "true");
    databaseUrl = appendConnectionParam(databaseUrl, "connection_limit", "1");
    databaseUrl = appendConnectionParam(databaseUrl, "sslmode", "require");
  }

  return databaseUrl;
}

export function getSupabaseUrl() {
  return getOptionalEnv("SUPABASE_URL") || getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function assertProductionServerEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  getRequiredEnv("AUTH_SECRET");
  getRequiredEnv("DATABASE_URL");
}
