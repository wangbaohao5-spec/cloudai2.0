import { describe, expect, it, vi } from "vitest";
import { ApiError, jsonError, settleTask } from "@/lib/api-errors";
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

  it("keeps optional task failures out of client warnings", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await settleTask(Promise.reject(new Error("database host and credential detail")), {
      logLabel: "history-save",
      warning: "历史记录暂时无法保存。",
    });

    expect(result).toEqual({ data: null, error: "历史记录暂时无法保存。" });
    expect(JSON.stringify(result)).not.toContain("database host and credential detail");
    expect(consoleWarn).toHaveBeenCalledWith("[api] optional task failed", {
      errorName: "Error",
      operation: "history-save",
    });
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain("database host and credential detail");
    consoleWarn.mockRestore();
  });
});
