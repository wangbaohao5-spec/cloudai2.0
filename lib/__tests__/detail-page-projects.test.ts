import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findFirst: vi.fn(),
  getDetailPageAssetCandidateForBinding: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    historyRecord: {
      create: mocks.create,
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
    },
  },
}));

vi.mock("@/lib/detail-page-assets", () => ({
  getDetailPageAssetCandidateForBinding: mocks.getDetailPageAssetCandidateForBinding,
}));

import { createDetailPageProject } from "@/lib/detail-page-project";
import {
  getDetailPageProjectForUser,
  getDetailPageProjectRecordId,
  persistDetailPageProject,
  updateDetailPageProject,
} from "@/lib/detail-page-projects";

function makeProject(overrides: { analysisHistoryId?: string; userId?: string } = {}) {
  let id = 0;
  return createDetailPageProject({
    analysisHistoryId: overrides.analysisHistoryId ?? "analysis-1",
    idFactory: () => `section-${++id}`,
    now: new Date("2026-09-19T08:00:00.000Z"),
    projectId: "detail-page-project-analysis-1",
    sectionCount: 5,
    sourceAssetId: "asset-1",
    userId: overrides.userId ?? "user-1",
  });
}

describe("detail page project persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({ id: "detail-page-project-analysis-1" });
    mocks.getDetailPageAssetCandidateForBinding.mockResolvedValue({ assetId: "asset-a" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("uses a stable history id scoped by user, analysis, and project type", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(getDetailPageProjectForUser("user-1", "analysis-1")).resolves.toBeNull();
    expect(getDetailPageProjectRecordId("analysis-1")).toBe("detail-page-project-analysis-1");
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: "detail-page-project-analysis-1",
        type: "detail-page-project",
        userId: "user-1",
      },
    });
  });

  it("does not recover a project whose embedded ownership does not match", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "detail-page-project-analysis-1",
      output: makeProject({ userId: "user-2" }),
    });

    await expect(getDetailPageProjectForUser("user-1", "analysis-1")).resolves.toBeNull();
  });

  it("recovers a valid persisted project after refresh", async () => {
    const project = makeProject();
    mocks.findFirst.mockResolvedValue({ id: project.projectId, output: project });

    await expect(getDetailPageProjectForUser("user-1", "analysis-1")).resolves.toEqual(project);
  });

  it("ignores malformed project JSON without leaking or throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.findFirst.mockResolvedValue({ id: "detail-page-project-analysis-1", output: { version: 2, userId: "user-1" } });

    await expect(getDetailPageProjectForUser("user-1", "analysis-1")).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[detail-page-project] malformed project ignored",
      expect.objectContaining({ analysisHistoryId: "analysis-1", historyId: "detail-page-project-analysis-1" }),
    );
    warn.mockRestore();
  });

  it("creates a new project without inventing schema fields", async () => {
    const project = makeProject();
    mocks.findFirst.mockResolvedValue(null);

    await expect(persistDetailPageProject(project, "测试商品")).resolves.toEqual(project);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetId: null,
        id: "detail-page-project-analysis-1",
        input: { analysisHistoryId: "analysis-1", source: "detail-page-v2" },
        output: project,
        title: "测试商品 详情页策划",
        type: "detail-page-project",
        userId: "user-1",
      }),
    });
  });

  it("returns an already persisted valid project instead of overwriting it", async () => {
    const project = makeProject();
    mocks.findFirst.mockResolvedValue({ id: project.projectId, output: project });

    await expect(persistDetailPageProject(makeProject(), "测试商品")).resolves.toEqual(project);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("updates with expected revision and increments revision atomically", async () => {
    const project = makeProject();
    mocks.findFirst.mockResolvedValue({ id: project.projectId, output: project });

    const next = await updateDetailPageProject({
      analysisHistoryId: "analysis-1",
      expectedRevision: 1,
      operation: { direction: "down", sectionId: "section-1", type: "move-section" },
      userId: "user-1",
    });

    expect(next.revision).toBe(2);
    expect(next.sections.map((section) => section.id).slice(0, 2)).toEqual(["section-2", "section-1"]);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      data: { output: next },
      where: {
        id: "detail-page-project-analysis-1",
        output: { equals: 1, path: ["revision"] },
        type: "detail-page-project",
        userId: "user-1",
      },
    });
  });

  it("rejects a stale revision before writing", async () => {
    const project = makeProject();
    mocks.findFirst.mockResolvedValue({ id: project.projectId, output: { ...project, revision: 2 } });

    await expect(
      updateDetailPageProject({
        analysisHistoryId: "analysis-1",
        expectedRevision: 1,
        operation: { direction: "down", sectionId: "section-1", type: "move-section" },
        userId: "user-1",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns a safe conflict when the compare-and-swap update loses a race", async () => {
    const project = makeProject();
    mocks.findFirst.mockResolvedValue({ id: project.projectId, output: project });
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      updateDetailPageProject({
        analysisHistoryId: "analysis-1",
        expectedRevision: 1,
        operation: { direction: "down", sectionId: "section-1", type: "move-section" },
        userId: "user-1",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("binds only an asset validated for the same user and product", async () => {
    const project = makeProject();
    mocks.findFirst.mockResolvedValue({ id: project.projectId, output: project });

    const next = await updateDetailPageProject({
      analysisHistoryId: "analysis-1",
      expectedRevision: 1,
      operation: { type: "bind-asset", sectionId: "section-1", assetId: "asset-a" },
      userId: "user-1",
    });

    expect(mocks.getDetailPageAssetCandidateForBinding).toHaveBeenCalledWith("user-1", "analysis-1", "asset-a");
    expect(next.sections[0]).toMatchObject({ selectedAssetId: "asset-a", readiness: "EXISTING_ASSET", lifecycle: "COMPLETE" });
    expect(next.revision).toBe(2);
  });

  it("denies an asset that is cross-product, cross-user, or missing without revealing which", async () => {
    const project = makeProject();
    mocks.findFirst.mockResolvedValue({ id: project.projectId, output: project });
    mocks.getDetailPageAssetCandidateForBinding.mockResolvedValueOnce(null);

    await expect(
      updateDetailPageProject({
        analysisHistoryId: "analysis-1",
        expectedRevision: 1,
        operation: { type: "bind-asset", sectionId: "section-1", assetId: "asset-outside-scope" },
        userId: "user-1",
      }),
    ).rejects.toMatchObject({ status: 404, message: "该素材不可用于当前商品，请重新选择。" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects every project mutation while a generation operation is active", async () => {
    const project = makeProject();
    project.sections[0] = {
      ...project.sections[0],
      generationOperationId: "operation-1",
      generationRequestId: "request-1",
      lifecycle: "GENERATING",
    };
    mocks.findFirst.mockResolvedValue({ id: project.projectId, output: project });

    await expect(
      updateDetailPageProject({
        analysisHistoryId: "analysis-1",
        expectedRevision: 1,
        operation: { type: "set-copy", sectionId: "section-2", headline: "标题", body: "正文" },
        userId: "user-1",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("persists copy editing with revision protection", async () => {
    const project = makeProject();
    mocks.findFirst.mockResolvedValue({ id: project.projectId, output: project });

    const next = await updateDetailPageProject({
      analysisHistoryId: "analysis-1",
      expectedRevision: 1,
      operation: { type: "set-copy", sectionId: "section-1", headline: "标题", body: "正文" },
      userId: "user-1",
    });

    expect(next.sections[0].copy).toEqual({ headline: "标题", body: "正文" });
    expect(next.revision).toBe(2);
  });
});
