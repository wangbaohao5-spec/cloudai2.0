import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchProvider: vi.fn(), logDiagnostic: vi.fn() }));

vi.mock("@/lib/ai/provider-http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/provider-http")>();
  return { ...actual, fetchProvider: mocks.fetchProvider };
});
vi.mock("@/lib/ai/provider-observability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/provider-observability")>();
  return { ...actual, logProviderDiagnostic: mocks.logDiagnostic };
});
vi.mock("@/lib/server-env", () => ({
  getRequiredEnv: vi.fn((name: string) => name === "RUN_API_KEY" ? "secret-api-key" : "https://runapi.example"),
}));
vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    rotate: () => ({
      flatten: () => ({
        toColorspace: () => ({
          png: () => ({ toBuffer: async () => Buffer.from("normalized-image-bytes") }),
        }),
      }),
    }),
  })),
}));

import { ProviderRequestError, ProviderTimeoutError } from "@/lib/ai/provider-http";
import { editImageWithRunApi } from "@/lib/ai/providers/run-image-edit";

const input = {
  diagnosticContext: { intentId: "intent-very-secret-value", moduleType: "PRODUCT_DETAIL", requestId: "request-very-secret-value", sectionId: "section-1" },
  fileName: "source.jpg",
  imageUrl: "https://signed.example/source?token=signed-url-secret",
  model: "gpt-image-2",
  prompt: "private product prompt",
  task: "product-detail-page" as const,
};

function sourceResponse() {
  return new Response(Buffer.from("source-image"), { status: 200 });
}

function providerResponse(status: number, body = JSON.stringify({ b64_json: "generated-base64" })) {
  return new Response(body, { status });
}

function diagnostics() {
  return mocks.logDiagnostic.mock.calls.map(([diagnostic]) => diagnostic as Record<string, unknown>);
}

describe("RunAPI image edit observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["ECONNRESET", "transport"],
    ["ETIMEDOUT", "transport"],
  ])("logs safe network cause %s at provider fetch", async (code, timeoutSource) => {
    const transportError = Object.assign(new Error("socket detail with secret"), { code });
    mocks.fetchProvider.mockResolvedValueOnce(sourceResponse()).mockRejectedValueOnce(new ProviderRequestError("safe", 502, transportError));

    await expect(editImageWithRunApi(input)).rejects.toBeInstanceOf(ProviderRequestError);
    expect(diagnostics()).toContainEqual(expect.objectContaining({
      causeCode: code,
      event: "provider-failure",
      stage: "PROVIDER_FETCH_START",
      timeoutSource,
    }));
  });

  it("identifies AbortSignal timeout separately", async () => {
    mocks.fetchProvider.mockResolvedValueOnce(sourceResponse()).mockRejectedValueOnce(new ProviderTimeoutError(Object.assign(new Error("timed out"), { code: "ABORT_ERR" })));

    await expect(editImageWithRunApi(input)).rejects.toBeInstanceOf(ProviderTimeoutError);
    expect(diagnostics()).toContainEqual(expect.objectContaining({
      causeCode: "ABORT_ERR",
      stage: "PROVIDER_FETCH_START",
      timeoutSource: "abort-signal",
    }));
  });

  it.each([
    [400, "BAD_REQUEST"],
    [413, "PAYLOAD_TOO_LARGE"],
    [429, "RATE_LIMIT"],
    [502, "UPSTREAM_SERVER"],
    [504, "UPSTREAM_SERVER"],
  ])("records HTTP %i with a safe error class", async (status, errorClass) => {
    mocks.fetchProvider.mockResolvedValueOnce(sourceResponse()).mockResolvedValueOnce(providerResponse(status, JSON.stringify({ error: { message: "provider raw secret" } })));

    await expect(editImageWithRunApi(input)).rejects.toBeInstanceOf(ProviderRequestError);
    expect(diagnostics()).toContainEqual(expect.objectContaining({
      errorClass,
      event: "provider-failure",
      stage: "OUTPUT_VALIDATION",
      status,
    }));
  });

  it("distinguishes a body read failure after headers", async () => {
    const response = {
      ok: true,
      status: 200,
      text: vi.fn().mockRejectedValue(Object.assign(new Error("body socket"), { code: "UND_ERR_BODY_TIMEOUT" })),
    } as unknown as Response;
    mocks.fetchProvider.mockResolvedValueOnce(sourceResponse()).mockResolvedValueOnce(response);

    await expect(editImageWithRunApi(input)).rejects.toBeInstanceOf(ProviderRequestError);
    expect(diagnostics()).toContainEqual(expect.objectContaining({ stage: "PROVIDER_HEADERS_RECEIVED", status: 200 }));
    expect(diagnostics()).toContainEqual(expect.objectContaining({ causeCode: "UND_ERR_BODY_TIMEOUT", event: "provider-failure", stage: "PROVIDER_BODY_RECEIVED" }));
  });

  it("distinguishes a successful HTTP response with invalid JSON", async () => {
    mocks.fetchProvider.mockResolvedValueOnce(sourceResponse()).mockResolvedValueOnce(providerResponse(200, "not-json private body"));

    await expect(editImageWithRunApi(input)).rejects.toBeInstanceOf(ProviderRequestError);
    expect(diagnostics()).toContainEqual(expect.objectContaining({ event: "provider-failure", stage: "PROVIDER_RESPONSE_PARSED", status: 200 }));
  });

  it("emits the full successful stage sequence with source byte size", async () => {
    mocks.fetchProvider.mockResolvedValueOnce(sourceResponse()).mockResolvedValueOnce(providerResponse(200));

    await expect(editImageWithRunApi(input)).resolves.toMatchObject({ b64Json: "generated-base64" });
    expect(diagnostics().map((item) => item.stage)).toEqual(expect.arrayContaining([
      "SOURCE_FETCH_START",
      "SOURCE_FETCH_END",
      "SOURCE_NORMALIZE_END",
      "MULTIPART_BUILD_END",
      "PROVIDER_FETCH_START",
      "PROVIDER_HEADERS_RECEIVED",
      "PROVIDER_BODY_RECEIVED",
      "PROVIDER_RESPONSE_PARSED",
      "OUTPUT_VALIDATION",
    ]));
    expect(diagnostics()).toContainEqual(expect.objectContaining({ normalizedSourceBytes: Buffer.from("normalized-image-bytes").byteLength }));
  });

  it("never logs secrets, prompts, signed URLs, image bytes, or full IDs", async () => {
    mocks.fetchProvider.mockResolvedValueOnce(sourceResponse()).mockResolvedValueOnce(providerResponse(400, JSON.stringify({ error: { message: "provider raw secret" } })));
    await expect(editImageWithRunApi(input)).rejects.toBeInstanceOf(ProviderRequestError);
    const serialized = JSON.stringify(diagnostics());

    for (const secret of ["secret-api-key", "private product prompt", "signed-url-secret", "provider raw secret", "normalized-image-bytes", "intent-very-secret-value", "request-very-secret-value"]) {
      expect(serialized).not.toContain(secret);
    }
    expect(serialized).toContain("inte...alue");
    expect(serialized).toContain("requ...alue");
  });
});
