import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  begin: vi.fn(),
  buildPrompt: vi.fn(),
  cleanup: vi.fn(),
  editImage: vi.fn(),
  fail: vi.fn(),
  finalizeUsage: vi.fn(),
  getAssetForUser: vi.fn(),
  getCandidates: vi.fn(),
  getCurrentUser: vi.fn(),
  getFileUrl: vi.fn(),
  getHistory: vi.fn(),
  persist: vi.fn(),
  prepare: vi.fn(),
  recover: vi.fn(),
  refundUsage: vi.fn(),
  reserveUsage: vi.fn(),
  resolveRoute: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock("@/lib/ai/image-edit-provider", () => ({ editImage: mocks.editImage }));
vi.mock("@/lib/ai/image-edit-router", () => ({ resolveImageEditRoute: mocks.resolveRoute }));
vi.mock("@/lib/ai/product-detail-page-section-prompt-builder", () => ({ buildProductDetailPageSectionPrompt: mocks.buildPrompt }));
vi.mock("@/lib/assets", () => ({ getAssetForUser: mocks.getAssetForUser }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/detail-page-assets", () => ({ getDetailPageAssetCandidates: mocks.getCandidates }));
vi.mock("@/lib/detail-page-section-generation", () => ({
  beginDetailPageSectionGeneration: mocks.begin,
  failDetailPageSectionGeneration: mocks.fail,
  persistGeneratedDetailPageSection: mocks.persist,
  prepareDetailPageSectionGeneration: mocks.prepare,
  recoverGeneratedDetailPageSection: mocks.recover,
}));
vi.mock("@/lib/generated-asset-cleanup", () => ({ cleanupGeneratedAssetAfterFailure: mocks.cleanup }));
vi.mock("@/lib/history", () => ({ getHistoryRecordForUser: mocks.getHistory }));
vi.mock("@/lib/product-copywriting", () => ({ isProductImageAnalysis: vi.fn(() => true) }));
vi.mock("@/lib/product-output-settings", () => ({ sanitizeProductOutputSettings: vi.fn((value) => value || null) }));
vi.mock("@/lib/storage", () => ({ getFileUrl: mocks.getFileUrl, uploadFile: mocks.uploadFile }));
vi.mock("@/lib/usage", () => ({
  classifyUsageFailure: vi.fn((_error, fallback) => fallback),
  finalizeUsage: mocks.finalizeUsage,
  getUsageRequestId: vi.fn((request: Request) => request.headers.get("x-request-id") || "request-generated"),
  refundUsage: mocks.refundUsage,
  reserveUsage: mocks.reserveUsage,
}));
vi.mock("sharp", () => ({
  default: vi.fn(() => ({ png: () => ({ toBuffer: async () => Buffer.from("valid-png") }) })),
}));

import { createDetailPageProject } from "@/lib/detail-page-project";
import { ApiError } from "@/lib/api-errors";
import { POST } from "@/app/api/products/detail-page/sections/generate/route";

function makeProject() {
  let id = 0;
  return createDetailPageProject({
    analysisHistoryId: "analysis-1",
    idFactory: () => `section-${++id}`,
    projectId: "detail-page-project-analysis-1",
    sectionCount: 5,
    sourceAssetId: "asset-source",
    userId: "user-1",
  });
}

function makeRequest(body: Record<string, unknown> = {}, requestId = "request-1234") {
  return new Request("http://localhost/api/products/detail-page/sections/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-request-id": requestId },
    body: JSON.stringify({ analysisHistoryId: "analysis-1", expectedRevision: 1, sectionId: "section-1", ...body }),
  });
}

describe("detail page V2 section generation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const project = makeProject();
    const completedProject = {
      ...project,
      revision: 3,
      sections: project.sections.map((section, index) =>
        index === 0
          ? { ...section, assetSource: "generated" as const, lifecycle: "COMPLETE" as const, readiness: "EXISTING_ASSET" as const, selectedAssetId: "asset-generated", generationRequestId: "request-1234" }
          : section,
      ),
    };
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getHistory.mockResolvedValue({ id: "analysis-1", assetId: "asset-source", type: "product-analysis", title: "测试商品", input: {}, output: {} });
    mocks.getAssetForUser.mockResolvedValue({ id: "asset-source", name: "source.jpg", type: "upload", url: "user/upload/source.jpg" });
    mocks.recover.mockResolvedValue(null);
    mocks.prepare.mockResolvedValue({ project, section: project.sections[0] });
    mocks.resolveRoute.mockReturnValue({ provider: "run-api", model: "gpt-image-2", modelId: "run-api-gpt-image-2-product-detail-page" });
    mocks.buildPrompt.mockReturnValue("safe visual-only prompt");
    mocks.reserveUsage.mockResolvedValue({ created: true, record: { id: "usage-1", status: "pending" } });
    mocks.begin.mockResolvedValue({ ...project, revision: 2 });
    mocks.getFileUrl.mockResolvedValue("https://signed.example/source");
    mocks.editImage.mockResolvedValue({ b64Json: Buffer.from("image").toString("base64"), provider: "run-api", model: "gpt-image-2", modelId: "model-id" });
    mocks.uploadFile.mockResolvedValue({ path: "user/image/generated.png", signedUrl: "https://signed.example/generated" });
    mocks.persist.mockResolvedValue({
      asset: { id: "asset-generated", name: "generated.png", type: "image", url: "user/image/generated.png", createdAt: new Date("2026-09-19T09:00:00.000Z") },
      history: { id: "history-generated" },
      project: completedProject,
    });
    mocks.finalizeUsage.mockResolvedValue({ status: "succeeded" });
    mocks.refundUsage.mockResolvedValue({ status: "refunded" });
    mocks.fail.mockResolvedValue(project);
    mocks.cleanup.mockResolvedValue(undefined);
    mocks.getCandidates.mockResolvedValue([{ assetId: "asset-generated", previewUrl: "https://signed.example/generated" }]);
  });

  it("requires authentication", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.reserveUsage).not.toHaveBeenCalled();
  });

  it("rejects malformed input before Usage or Provider", async () => {
    const response = await POST(makeRequest({ sectionId: "", expectedRevision: 0 }));

    expect(response.status).toBe(400);
    expect(mocks.reserveUsage).not.toHaveBeenCalled();
    expect(mocks.editImage).not.toHaveBeenCalled();
  });

  it("rejects missing canonical product reference before Usage", async () => {
    mocks.getAssetForUser.mockResolvedValue(null);
    const response = await POST(makeRequest());

    expect(response.status).toBe(422);
    expect(mocks.reserveUsage).not.toHaveBeenCalled();
    expect(mocks.editImage).not.toHaveBeenCalled();
  });

  it("rejects ineligible module before Usage", async () => {
    mocks.prepare.mockRejectedValue(new ApiError("请先补充资料。", 422));
    const response = await POST(makeRequest());

    expect(response.status).toBe(422);
    expect(mocks.reserveUsage).not.toHaveBeenCalled();
  });

  it("uses only the owned canonical source Asset and ignores injected URLs", async () => {
    await POST(makeRequest({ sourceUrl: "https://attacker.example/image.png", storagePath: "other-user/private.png" }));

    expect(mocks.getFileUrl).toHaveBeenCalledWith("user/upload/source.jpg");
    expect(mocks.editImage).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: "https://signed.example/source" }));
    expect(JSON.stringify(mocks.editImage.mock.calls)).not.toContain("attacker.example");
  });

  it("reserves, generates, persists, then finalizes successful Usage", async () => {
    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.reserveUsage).toHaveBeenCalledBefore(mocks.editImage);
    expect(mocks.persist).toHaveBeenCalledBefore(mocks.finalizeUsage);
    expect(data.project.sections[0].selectedAssetId).toBe("asset-generated");
    expect(data.candidate.previewUrl).toBe("https://signed.example/generated");
  });

  it("passes pageStyle and the target Section to the prompt builder", async () => {
    await POST(makeRequest());

    expect(mocks.buildPrompt).toHaveBeenCalledWith(expect.objectContaining({
      pageStyle: expect.objectContaining({ preset: "ecommerce" }),
      productTitle: "测试商品",
      section: expect.objectContaining({ id: "section-1", moduleType: "HERO" }),
    }));
  });

  it("persists stable generation metadata without signed URLs", async () => {
    await POST(makeRequest());
    const input = mocks.persist.mock.calls[0][0];

    expect(input.historyInput).toMatchObject({ analysisHistoryId: "analysis-1", detailPageProjectId: "detail-page-project-analysis-1", sectionId: "section-1", requestId: "request-1234", source: "detail-page-v2" });
    expect(input.historyOutput).not.toHaveProperty("imageUrl");
    expect(JSON.stringify(input)).not.toContain("signed.example");
  });

  it("recovers a completed request before checking a stale revision or reserving again", async () => {
    const project = makeProject();
    mocks.recover.mockResolvedValueOnce({ assetId: "asset-generated", project });
    const response = await POST(makeRequest({ expectedRevision: 1 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recovered).toBe(true);
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.reserveUsage).not.toHaveBeenCalled();
    expect(mocks.editImage).not.toHaveBeenCalled();
  });

  it("does not call Provider for an unresolved duplicate requestId", async () => {
    mocks.reserveUsage.mockResolvedValue({ created: false, record: { id: "usage-1", status: "pending" } });
    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect(mocks.editImage).not.toHaveBeenCalled();
  });

  it("refunds and settles only the target Section after Provider failure", async () => {
    mocks.editImage.mockRejectedValue(new Error("provider socket secret"));
    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).not.toContain("socket secret");
    expect(mocks.fail).toHaveBeenCalledWith(expect.objectContaining({ sectionId: "section-1" }));
    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ usageRecordId: "usage-1", userId: "user-1" }));
  });

  it("refunds after Storage upload failure", async () => {
    mocks.uploadFile.mockRejectedValue(new Error("storage failed"));
    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    expect(mocks.refundUsage).toHaveBeenCalledOnce();
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("cleans uploaded Storage and refunds after DB persistence failure", async () => {
    mocks.persist.mockRejectedValue(new Error("transaction failed"));
    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    expect(mocks.cleanup).toHaveBeenCalledWith(expect.objectContaining({ storagePath: "user/image/generated.png" }));
    expect(mocks.refundUsage).toHaveBeenCalledOnce();
    expect(mocks.fail).toHaveBeenCalledOnce();
  });

  it("does not clean a committed Asset when Usage finalize remains pending", async () => {
    mocks.finalizeUsage.mockRejectedValue(new Error("finalize unavailable"));
    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.warning).toBe("视觉已保存，额度状态暂未确认。");
    expect(mocks.cleanup).not.toHaveBeenCalled();
    expect(mocks.refundUsage).not.toHaveBeenCalled();
  });

  it("does not expose provider internals or storage path as response fields", async () => {
    const response = await POST(makeRequest());
    const data = await response.json();
    const serialized = JSON.stringify(data);

    expect(data).not.toHaveProperty("requestId");
    expect(data.candidate).not.toHaveProperty("storagePath");
    expect(serialized).not.toContain("user/image/generated.png");
    expect(serialized).not.toContain("run-api");
  });
});
