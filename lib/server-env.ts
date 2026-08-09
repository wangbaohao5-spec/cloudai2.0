type EnvName =
  | "AUTH_SECRET"
  | "DATABASE_URL"
  | "DEEPSEEK_API_KEY"
  | "DASHSCOPE_API_KEY"
  | "DASHSCOPE_VISION_MODEL"
  | "DASHSCOPE_VIDEO_MODEL"
  | "RUN_API_KEY"
  | "RUN_API_BASE_URL"
  | "SUPABASE_URL"
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
