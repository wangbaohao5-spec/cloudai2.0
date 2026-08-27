import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAssetForUser: vi.fn(),
  getCurrentUser: vi.fn(),
  getFileUrl: vi.fn(),
}));

vi.mock("@/lib/assets", () => ({ getAssetForUser: mocks.getAssetForUser }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/storage", () => ({ getFileUrl: mocks.getFileUrl }));

import { GET } from "@/app/api/assets/[id]/url/route";

describe("Asset URL route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getAssetForUser.mockResolvedValue({ id: "asset-1", type: "image", name: "asset.png", url: "user-1/image/asset.png" });
    mocks.getFileUrl.mockResolvedValue("https://storage.test/fresh.png");
  });

  it("returns a fresh ownership-scoped URL with no-store caching", async () => {
    const response = await GET(new Request("http://localhost/api/assets/asset-1/url"), {
      params: Promise.resolve({ id: "asset-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.getAssetForUser).toHaveBeenCalledWith("user-1", "asset-1");
    expect(await response.json()).toEqual(expect.objectContaining({ url: "https://storage.test/fresh.png" }));
  });
});
