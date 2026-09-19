import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getDetailPageAssetCandidates: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/detail-page-assets", () => ({ getDetailPageAssetCandidates: mocks.getDetailPageAssetCandidates }));

import { GET } from "@/app/api/products/detail-page/assets/route";

describe("detail page asset candidate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDetailPageAssetCandidates.mockResolvedValue([]);
  });

  it("requires authentication", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/products/detail-page/assets?analysisHistoryId=analysis-a"));

    expect(response.status).toBe(401);
    expect(mocks.getDetailPageAssetCandidates).not.toHaveBeenCalled();
  });

  it("returns no-store candidates scoped to the authenticated user and product", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-a" });
    mocks.getDetailPageAssetCandidates.mockResolvedValue([{ assetId: "asset-a", previewUrl: null }]);

    const response = await GET(new Request("http://localhost/api/products/detail-page/assets?analysisHistoryId=analysis-a"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(data.candidates).toEqual([{ assetId: "asset-a", previewUrl: null }]);
    expect(mocks.getDetailPageAssetCandidates).toHaveBeenCalledWith("user-a", "analysis-a");
  });
});
