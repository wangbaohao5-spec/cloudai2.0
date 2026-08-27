import { describe, expect, it } from "vitest";
import { ApiError, jsonError } from "@/lib/api-errors";
import { ProviderTimeoutError } from "@/lib/ai/provider-http";

describe("API error responses", () => {
  it("preserves explicitly controlled API errors", async () => {
    const response = jsonError(new ApiError("Safe input message", 400), "fallback");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Safe input message" });
  });

  it("hides unknown internal error messages", async () => {
    const response = jsonError(new Error("database internal connection detail"), "fallback");
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "服务器暂时无法处理请求，请稍后重试。" });
  });

  it("maps provider timeout to a safe 504", async () => {
    const response = jsonError(new ProviderTimeoutError(new Error("UND_ERR_CONNECT_TIMEOUT")), "fallback");
    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({ error: "生成服务响应超时，请稍后重试。" });
  });
});
