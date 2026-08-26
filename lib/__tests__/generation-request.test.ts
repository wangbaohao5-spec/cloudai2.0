import { describe, expect, it, vi } from "vitest";
import { createGenerationAttempt } from "@/lib/generation-request";

describe("generation request ids", () => {
  it("reuses one request id for retries within the same user attempt", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const attempt = createGenerationAttempt(fetcher);

    await attempt.fetch("/api/test", { method: "POST" });
    await attempt.fetch("/api/test", { method: "POST" });

    const firstHeaders = new Headers(fetcher.mock.calls[0][1].headers);
    const secondHeaders = new Headers(fetcher.mock.calls[1][1].headers);
    expect(firstHeaders.get("x-request-id")).toBe(attempt.requestId);
    expect(secondHeaders.get("x-request-id")).toBe(attempt.requestId);
  });

  it("creates a new request id for a new user attempt", () => {
    expect(createGenerationAttempt(vi.fn()).requestId).not.toBe(createGenerationAttempt(vi.fn()).requestId);
  });
});
