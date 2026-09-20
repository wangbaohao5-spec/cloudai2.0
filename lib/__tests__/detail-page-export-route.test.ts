import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assetCreate: vi.fn(),
  assetFindFirst: vi.fn(),
  compose: vi.fn(),
  createHistory: vi.fn(),
  downloadFile: vi.fn(),
  editImage: vi.fn(),
  getCandidate: vi.fn(),
  getCurrentUser: vi.fn(),
  getHistory: vi.fn(),
  getProject: vi.fn(),
  getRenderPlan: vi.fn(),
  renderSection: vi.fn(),
  reserveUsage: vi.fn(),
  updateProject: vi.fn(),
  uploadFile: vi.fn(),
  validateBudget: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/detail-page-assets", () => ({ getDetailPageAssetCandidateForBinding: mocks.getCandidate }));
vi.mock("@/lib/detail-page-projects", () => ({
  getDetailPageProjectForUser: mocks.getProject,
  updateDetailPageProject: mocks.updateProject,
}));
vi.mock("@/lib/history", () => ({ getHistoryRecordForUser: mocks.getHistory }));
vi.mock("@/lib/storage", () => ({ downloadFile: mocks.downloadFile, uploadFile: mocks.uploadFile }));
vi.mock("@/lib/usage", () => ({ reserveUsage: mocks.reserveUsage }));
vi.mock("@/lib/ai/image-edit-provider", () => ({ editImage: mocks.editImage }));
vi.mock("@/lib/db", () => ({
  db: {
    asset: { create: mocks.assetCreate, findFirst: mocks.assetFindFirst },
    historyRecord: { create: mocks.createHistory },
  },
}));
vi.mock("@/lib/detail-page-export-renderer", () => ({
  composeDetailPageExport: mocks.compose,
  getDetailPageExportContentType: () => "image/jpeg",
  getDetailPageSectionRenderPlan: mocks.getRenderPlan,
  renderDetailPageSection: mocks.renderSection,
  validateDetailPageCompositeBudget: mocks.validateBudget,
}));

import { POST } from "@/app/api/products/detail-page/export/route";
import { createDetailPageProject, type DetailPageProjectV2 } from "@/lib/detail-page-project";

function makeProject(): DetailPageProjectV2 {
  let id = 0;
  const project = createDetailPageProject({
    analysisHistoryId: "analysis-1",
    idFactory: () => `section-${++id}`,
    projectId: "detail-page-project-analysis-1",
    sectionCount: 5,
    sourceAssetId: "asset-source",
    userId: "user-1",
  });

  return {
    ...project,
    revision: 7,
    sections: project.sections.map((section, index) => index === 0
      ? {
          ...section,
          assetSource: "existing-asset" as const,
          copy: { headline: "温和洁面", body: "清晰呈现真实商品。" },
          lifecycle: "COMPLETE" as const,
          readiness: "EXISTING_ASSET" as const,
          selectedAssetId: "asset-source",
        }
      : { ...section, hidden: true }),
  };
}

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/products/detail-page/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analysisHistoryId: "analysis-1",
      expectedRevision: 7,
      mode: "full",
      projectId: "detail-page-project-analysis-1",
      ...body,
    }),
  });
}

function expectNoWritesOrGeneration() {
  expect(mocks.reserveUsage).not.toHaveBeenCalled();
  expect(mocks.editImage).not.toHaveBeenCalled();
  expect(mocks.uploadFile).not.toHaveBeenCalled();
  expect(mocks.assetCreate).not.toHaveBeenCalled();
  expect(mocks.createHistory).not.toHaveBeenCalled();
  expect(mocks.updateProject).not.toHaveBeenCalled();
}

describe("detail page V2 export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const project = makeProject();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getProject.mockResolvedValue(project);
    mocks.getHistory.mockResolvedValue({ id: "analysis-1", title: "Freeplus Cleanser", type: "product-analysis" });
    mocks.getCandidate.mockResolvedValue({ assetId: "asset-source" });
    mocks.assetFindFirst.mockResolvedValue({ url: "user-1/upload/source.jpg" });
    mocks.downloadFile.mockResolvedValue(Buffer.from("source-image"));
    mocks.getRenderPlan.mockReturnValue({ height: 1_000 });
    mocks.renderSection.mockImplementation(async ({ section }) => ({
      buffer: Buffer.from(`rendered-${section.id}`),
      height: 1_000,
      sectionId: section.id,
    }));
    mocks.compose.mockResolvedValue(Buffer.from("full-export"));
    mocks.validateBudget.mockReturnValue({ totalHeight: 1_000, totalPixels: 1_200_000 });
  });

  it("requires authentication without touching project or export services", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.getProject).not.toHaveBeenCalled();
    expect(mocks.renderSection).not.toHaveBeenCalled();
    expectNoWritesOrGeneration();
  });

  it("rejects malformed requests before reading project state", async () => {
    const response = await POST(makeRequest({ expectedRevision: 0, mode: "archive" }));

    expect(response.status).toBe(400);
    expect(mocks.getProject).not.toHaveBeenCalled();
    expectNoWritesOrGeneration();
  });

  it("does not expose another user's project", async () => {
    mocks.getProject.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(404);
    expect(mocks.downloadFile).not.toHaveBeenCalled();
    expectNoWritesOrGeneration();
  });

  it("rejects a stale project revision before asset reads", async () => {
    const response = await POST(makeRequest({ expectedRevision: 6 }));

    expect(response.status).toBe(409);
    expect(mocks.getCandidate).not.toHaveBeenCalled();
    expect(mocks.downloadFile).not.toHaveBeenCalled();
    expectNoWritesOrGeneration();
  });

  it("rejects an asset that is not related to this product", async () => {
    mocks.getCandidate.mockResolvedValue(null);

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.blockingSections).toEqual([
      expect.objectContaining({ reasonCode: "MISSING_ASSET", sectionId: "section-1" }),
    ]);
    expect(mocks.assetFindFirst).not.toHaveBeenCalled();
    expectNoWritesOrGeneration();
  });

  it("returns a safe blocker when the owned Storage object is unavailable", async () => {
    mocks.downloadFile.mockRejectedValue(new Error("signed service key and storage details"));

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).not.toContain("service key");
    expect(data.blockingSections[0]).toMatchObject({ reasonCode: "MISSING_ASSET", sectionId: "section-1" });
    expectNoWritesOrGeneration();
  });

  it("downloads an owned path and returns a private full JPEG attachment", async () => {
    const projectBefore = structuredClone(await mocks.getProject());
    const response = await POST(makeRequest({
      assetUrl: "https://attacker.example/injected.jpg",
      storagePath: "other-user/private.jpg",
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="vahoro-detail-page-freeplus-cleanser.jpg"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("full-export");
    expect(mocks.downloadFile).toHaveBeenCalledWith("user-1/upload/source.jpg", expect.any(Number));
    expect(JSON.stringify(mocks.downloadFile.mock.calls)).not.toContain("attacker.example");
    expect(await mocks.getProject()).toEqual(projectBefore);
    expectNoWritesOrGeneration();
  });

  it("returns a section JPEG without requiring unrelated hidden modules", async () => {
    const response = await POST(makeRequest({ mode: "section", sectionId: "section-1" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="01-hero.jpg"');
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("rendered-section-1");
    expect(mocks.compose).not.toHaveBeenCalled();
    expectNoWritesOrGeneration();
  });

  it("renders and composes visible sections in persisted project order", async () => {
    const project = makeProject();
    const second = {
      ...project.sections[2],
      assetSource: "existing-asset" as const,
      copy: { headline: "使用场景", body: "真实、克制的日常环境。" },
      hidden: false,
      lifecycle: "COMPLETE" as const,
      order: 0,
      readiness: "EXISTING_ASSET" as const,
      selectedAssetId: "asset-scene",
    };
    const first = { ...project.sections[0], order: 1 };
    mocks.getProject.mockResolvedValue({ ...project, sections: [first, project.sections[1], second, ...project.sections.slice(3)] });
    mocks.getCandidate.mockImplementation(async (_userId, _analysisId, assetId) => ({ assetId }));
    mocks.assetFindFirst.mockImplementation(async ({ where }) => ({ url: `user-1/image/${where.id}.jpg` }));

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mocks.renderSection.mock.calls.map(([input]) => input.section.id)).toEqual(["section-3", "section-1"]);
    expect(mocks.compose).toHaveBeenCalledWith([
      expect.objectContaining({ sectionId: "section-3" }),
      expect.objectContaining({ sectionId: "section-1" }),
    ], "ecommerce");
    expectNoWritesOrGeneration();
  });

  it("allows repeated export without Usage or persistence side effects", async () => {
    const first = await POST(makeRequest());
    const second = await POST(makeRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mocks.renderSection).toHaveBeenCalledTimes(2);
    expectNoWritesOrGeneration();
  });

  it("keeps project state unchanged when rendering fails", async () => {
    const project = makeProject();
    const before = structuredClone(project);
    mocks.getProject.mockResolvedValue(project);
    mocks.renderSection.mockRejectedValue(new Error("sharp internal details"));

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).not.toContain("sharp internal details");
    expect(project).toEqual(before);
    expectNoWritesOrGeneration();
  });
});
