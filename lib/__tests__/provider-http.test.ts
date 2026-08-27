import { describe, expect, it, vi } from "vitest";
import { fetchProvider, PROVIDER_TIMEOUTS, ProviderRequestError, ProviderTimeoutError } from "@/lib/ai/provider-http";

describe("provider HTTP reliability", () => {
  it("uses task-appropriate timeout budgets", () => {
    expect(PROVIDER_TIMEOUTS.text).toBe(60_000);
    expect(PROVIDER_TIMEOUTS.vision).toBe(90_000);
    expect(PROVIDER_TIMEOUTS.image).toBe(120_000);
  });

  it("maps an expired provider request to a safe timeout error", async () => {
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    })) as typeof fetch;

    await expect(fetchProvider("https://provider.invalid", {}, 5, fetcher)).rejects.toBeInstanceOf(ProviderTimeoutError);
  });

  it("maps raw network failures to a safe provider error", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("socket included internal detail")) as typeof fetch;

    await expect(fetchProvider("https://provider.invalid", {}, 100, fetcher)).rejects.toMatchObject({
      message: "生成服务暂时不可用，请稍后重试。",
      status: 502,
    } satisfies Partial<ProviderRequestError>);
  });
});
