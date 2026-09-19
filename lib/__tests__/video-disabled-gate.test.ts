import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildVideoPrompt: vi.fn(),
  enforceUsageLimitAndRecord: vi.fn(),
  generateVideo: vi.fn(),
  getCurrentUser: vi.fn(),
  saveHistory: vi.fn(),
  saveRemoteAsset: vi.fn(),
}));

vi.mock("@/lib/beta-features", () => ({ BETA_VIDEO_ENABLED: false }));
vi.mock("@/lib/ai/providers/video-provider", () => ({ generateVideo: mocks.generateVideo }));
vi.mock("@/lib/ai/video-prompt-builder", () => ({ buildVideoPrompt: mocks.buildVideoPrompt }));
vi.mock("@/lib/asset-ingest", () => ({ saveRemoteAsset: mocks.saveRemoteAsset }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/history", () => ({ saveHistory: mocks.saveHistory }));
vi.mock("@/lib/usage", () => ({ enforceUsageLimitAndRecord: mocks.enforceUsageLimitAndRecord }));

import { POST } from "@/app/api/video/generate/route";

describe("disabled video route gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 before auth, usage, provider, or persistence work", async () => {
    const response = await POST(new Request("http://localhost/api/video/generate", { method: "POST" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "视频工坊暂未向封闭内测开放。" });
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.enforceUsageLimitAndRecord).not.toHaveBeenCalled();
    expect(mocks.buildVideoPrompt).not.toHaveBeenCalled();
    expect(mocks.generateVideo).not.toHaveBeenCalled();
    expect(mocks.saveRemoteAsset).not.toHaveBeenCalled();
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });
});
