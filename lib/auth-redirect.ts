const DEFAULT_CALLBACK_URL = "/dashboard";

export function getSafeCallbackUrl(callbackUrl?: string | null) {
  if (!callbackUrl) {
    return DEFAULT_CALLBACK_URL;
  }

  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return DEFAULT_CALLBACK_URL;
  }

  return callbackUrl;
}
