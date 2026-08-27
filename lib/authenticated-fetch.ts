import { clearProductSessionStorage } from "@/lib/product-session-storage";

type UnauthorizedHandlingOptions = {
  redirect?: (url: string) => void;
  storage?: Storage;
};

export function handleUnauthorizedResponse(response: Response, options: UnauthorizedHandlingOptions = {}) {
  if (response.status !== 401) {
    return false;
  }

  const storage = options.storage || (typeof window !== "undefined" ? window.sessionStorage : undefined);
  const redirect = options.redirect || (typeof window !== "undefined" ? (url: string) => window.location.assign(url) : undefined);

  if (storage) {
    clearProductSessionStorage(storage);
  }

  redirect?.("/login?reason=session-expired");
  return true;
}

export async function fetchWithAuthHandling(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  handleUnauthorizedResponse(response);
  return response;
}
