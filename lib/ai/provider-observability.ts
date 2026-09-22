export const PROVIDER_DIAGNOSTIC_STAGES = [
  "SOURCE_FETCH_START",
  "SOURCE_FETCH_END",
  "SOURCE_NORMALIZE_END",
  "MULTIPART_BUILD_END",
  "PROVIDER_FETCH_START",
  "PROVIDER_HEADERS_RECEIVED",
  "PROVIDER_BODY_RECEIVED",
  "PROVIDER_RESPONSE_PARSED",
  "OUTPUT_VALIDATION",
  "STORAGE_UPLOAD_START",
  "STORAGE_UPLOAD_END",
] as const;

export type ProviderDiagnosticStage = (typeof PROVIDER_DIAGNOSTIC_STAGES)[number];

export type ProviderDiagnosticContext = {
  intentId?: string | null;
  moduleType?: string | null;
  requestId?: string | null;
  sectionId?: string | null;
};

export type ProviderDiagnostic = {
  causeCode?: string;
  elapsedMs: number;
  errorClass?: string;
  errorName?: string;
  event: "provider-stage" | "provider-failure";
  host: string;
  intentId?: string;
  moduleType?: string;
  normalizedSourceBytes?: number;
  provider: string;
  requestId?: string;
  sectionId?: string;
  stage: ProviderDiagnosticStage;
  status?: number;
  task: string;
  timeoutSource?: "abort-signal" | "provider" | "transport";
  totalElapsedMs: number;
};

function cleanLabel(value: string | null | undefined, limit = 100) {
  return typeof value === "string" ? value.trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, limit) : "";
}

export function maskDiagnosticId(value: string | null | undefined) {
  const clean = cleanLabel(value, 200);
  if (!clean) return undefined;
  if (clean.length <= 8) return `${clean.slice(0, 2)}***${clean.slice(-2)}`;
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

export function getSafeProviderCauseCode(error: unknown): string | undefined {
  let current = error;

  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Z0-9_]{2,64}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }

  return undefined;
}

export function classifyProviderHttpStatus(status: number) {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "AUTHENTICATION";
  if (status === 403) return "AUTHORIZATION";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 429) return "RATE_LIMIT";
  if (status >= 500) return "UPSTREAM_SERVER";
  return "HTTP_ERROR";
}

export function createProviderDiagnostic({
  context,
  elapsedMs,
  error,
  errorClass,
  event = "provider-stage",
  host,
  normalizedSourceBytes,
  provider,
  stage,
  status,
  task,
  timeoutSource,
  totalElapsedMs,
}: {
  context?: ProviderDiagnosticContext;
  elapsedMs: number;
  error?: unknown;
  errorClass?: string;
  event?: ProviderDiagnostic["event"];
  host: string;
  normalizedSourceBytes?: number;
  provider: string;
  stage: ProviderDiagnosticStage;
  status?: number;
  task: string;
  timeoutSource?: ProviderDiagnostic["timeoutSource"];
  totalElapsedMs: number;
}): ProviderDiagnostic {
  const diagnostic: ProviderDiagnostic = {
    event,
    provider: cleanLabel(provider) || "unknown",
    host: cleanLabel(host) || "unknown",
    task: cleanLabel(task) || "unknown",
    stage,
    elapsedMs: Math.max(0, Math.round(elapsedMs)),
    totalElapsedMs: Math.max(0, Math.round(totalElapsedMs)),
  };
  const requestId = maskDiagnosticId(context?.requestId);
  const intentId = maskDiagnosticId(context?.intentId);
  const sectionId = cleanLabel(context?.sectionId);
  const moduleType = cleanLabel(context?.moduleType);
  const causeCode = getSafeProviderCauseCode(error);

  if (requestId) diagnostic.requestId = requestId;
  if (intentId) diagnostic.intentId = intentId;
  if (sectionId) diagnostic.sectionId = sectionId;
  if (moduleType) diagnostic.moduleType = moduleType;
  if (Number.isFinite(normalizedSourceBytes)) diagnostic.normalizedSourceBytes = Math.max(0, Math.round(normalizedSourceBytes!));
  if (Number.isInteger(status)) diagnostic.status = status;
  if (error instanceof Error) diagnostic.errorName = cleanLabel(error.name) || "Error";
  if (causeCode) diagnostic.causeCode = causeCode;
  if (errorClass) diagnostic.errorClass = cleanLabel(errorClass);
  if (timeoutSource) diagnostic.timeoutSource = timeoutSource;

  return diagnostic;
}

export function logProviderDiagnostic(diagnostic: ProviderDiagnostic) {
  const logger = diagnostic.event === "provider-failure" ? console.error : console.info;
  logger("[provider-observability]", diagnostic);
}
