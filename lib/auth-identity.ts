export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function firstForwardedAddress(value: string | null) {
  return value?.split(",", 1)[0]?.trim().slice(0, 128) || "";
}

export function getTrustedClientIp(headers: Headers) {
  if (process.env.VERCEL) {
    return firstForwardedAddress(headers.get("x-vercel-forwarded-for")) || firstForwardedAddress(headers.get("x-real-ip")) || "unknown";
  }

  return firstForwardedAddress(headers.get("x-real-ip")) || firstForwardedAddress(headers.get("x-forwarded-for")) || "unknown";
}
