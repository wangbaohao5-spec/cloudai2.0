import { fetchWithAuthHandling } from "@/lib/authenticated-fetch";

type Fetcher = typeof fetch;

export type GenerationAttempt = {
  requestId: string;
  fetch: Fetcher;
};

export function createGenerationAttempt(fetcher: Fetcher = fetchWithAuthHandling): GenerationAttempt {
  const requestId = crypto.randomUUID();

  return {
    requestId,
    fetch(input, init) {
      const headers = new Headers(init?.headers);
      headers.set("x-request-id", requestId);

      return fetcher(input, {
        ...init,
        headers,
      });
    },
  };
}
