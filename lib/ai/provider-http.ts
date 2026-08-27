export const PROVIDER_TIMEOUTS = {
  text: 60_000,
  vision: 90_000,
  image: 120_000,
  video: 120_000,
} as const;

export class ProviderRequestError extends Error {
  status: number;

  constructor(message: string, status: number, cause?: unknown) {
    super(message, { cause });
    this.name = "ProviderRequestError";
    this.status = status;
  }
}

export class ProviderTimeoutError extends ProviderRequestError {
  constructor(cause?: unknown) {
    super("生成服务响应超时，请稍后重试。", 504, cause);
    this.name = "ProviderTimeoutError";
  }
}

export async function fetchProvider(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number,
  fetcher: typeof fetch = fetch,
) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;

  try {
    return await fetcher(input, { ...init, signal });
  } catch (error) {
    if (timeoutSignal.aborted) {
      throw new ProviderTimeoutError(error);
    }

    if (error instanceof ProviderRequestError) {
      throw error;
    }

    throw new ProviderRequestError("生成服务暂时不可用，请稍后重试。", 502, error);
  }
}
