import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enhanceImage: vi.fn(),
  getCurrentInternalUser: vi.fn(),
  saveHistory: vi.fn(),
}));

vi.mock("@/lib/ai/image-enhance-provider", () => ({ enhanceImage: mocks.enhanceImage }));
vi.mock("@/lib/history", () => ({ saveHistory: mocks.saveHistory }));
vi.mock("@/lib/internal-route-access", () => ({
  getCurrentInternalUser: mocks.getCurrentInternalUser,
}));

import { POST } from "@/app/api/image-enhance/route";

function request(body: unknown) {
  return new Request("http://localhost/api/image-enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("legacy image-enhance route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a non-disclosing 404 before processing input for ordinary beta users", async () => {
    mocks.getCurrentInternalUser.mockResolvedValue(null);

    const response = await POST(request({ fileName: "test.png", imagePreviewUrl: "data:image/png;base64,raw" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(mocks.enhanceImage).not.toHaveBeenCalled();
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });

  it("remains available to an explicitly allowed internal user", async () => {
    mocks.getCurrentInternalUser.mockResolvedValue({ id: "internal-user" });
    mocks.enhanceImage.mockResolvedValue({
      imageUrl: "data:image/png;base64,result",
      provider: "mock-image-enhance",
    });
    mocks.saveHistory.mockResolvedValue({ id: "history-1" });

    const response = await POST(request({ fileName: "test.png", imagePreviewUrl: "data:image/png;base64,input" }));

    expect(response.status).toBe(200);
    expect(mocks.enhanceImage).toHaveBeenCalledOnce();
    expect(mocks.saveHistory).toHaveBeenCalledWith(expect.objectContaining({ userId: "internal-user" }));
  });

  it("never returns a raw history persistence error in client warnings", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.getCurrentInternalUser.mockResolvedValue({ id: "internal-user" });
    mocks.enhanceImage.mockResolvedValue({
      imageUrl: "data:image/png;base64,result",
      provider: "mock-image-enhance",
    });
    mocks.saveHistory.mockRejectedValue(new Error("postgres credential and host detail"));

    const response = await POST(request({ fileName: "test.png", imagePreviewUrl: "data:image/png;base64,input" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.warnings).toEqual([expect.stringContaining("历史记录")]);
    expect(JSON.stringify(body)).not.toContain("postgres credential and host detail");
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain("postgres credential and host detail");
    consoleWarn.mockRestore();
  });
});
