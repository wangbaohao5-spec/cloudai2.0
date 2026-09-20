import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assetCreate: vi.fn(),
  findFirst: vi.fn(),
  historyCreate: vi.fn(),
  finalizeUsage: vi.fn(),
  refundUsage: vi.fn(),
  transaction: vi.fn(),
  txFindFirst: vi.fn(),
  txUpdateMany: vi.fn(),
  updateMany: vi.fn(),
  usageFindFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: mocks.transaction,
    historyRecord: {
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
    },
    usageRecord: {
      findFirst: mocks.usageFindFirst,
    },
  },
}));

vi.mock("@/lib/usage", () => ({
  finalizeUsage: mocks.finalizeUsage,
  refundUsage: mocks.refundUsage,
}));

import {
  applyDetailPageProjectOperation,
  createDetailPageProject,
  type DetailPageModuleType,
  type DetailPageProjectV2,
} from "@/lib/detail-page-project";
import {
  assertDetailPageSectionGenerationEligibility,
  beginDetailPageSectionGeneration,
  DETAIL_PAGE_GENERATION_STALE_MS,
  failDetailPageSectionGeneration,
  persistGeneratedDetailPageSection,
  prepareDetailPageSectionGeneration,
  reconcileStaleDetailPageGeneration,
  recoverGeneratedDetailPageSection,
} from "@/lib/detail-page-section-generation";

function makeProject() {
  let id = 0;
  return createDetailPageProject({
    analysisHistoryId: "analysis-1",
    idFactory: () => `section-${++id}`,
    now: new Date("2026-09-19T08:00:00.000Z"),
    projectId: "detail-page-project-analysis-1",
    sectionCount: 7,
    sourceAssetId: "asset-source",
    userId: "user-1",
  });
}

function sectionFor(project: DetailPageProjectV2, moduleType: DetailPageModuleType) {
  return project.sections.find((section) => section.moduleType === moduleType)!;
}

function withConfirmedEvidence(project: DetailPageProjectV2, moduleType: DetailPageModuleType, value = "人工确认资料") {
  const section = sectionFor(project, moduleType);
  return applyDetailPageProjectOperation(project, { type: "set-evidence", sectionId: section.id, value });
}

function withGeneration(
  project: DetailPageProjectV2,
  sectionId = "section-1",
  selectedAssetId: string | null = null,
  generationStartedAt = new Date().toISOString(),
) {
  return {
    ...project,
    revision: project.revision + 1,
    sections: project.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            selectedAssetId,
            lifecycle: "GENERATING" as const,
            generationOperationId: "operation-1",
            generationRequestId: "request-1",
            generationStartedAt,
          }
        : section,
    ),
  };
}

describe("detail page section generation state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.txUpdateMany.mockResolvedValue({ count: 1 });
    mocks.assetCreate.mockResolvedValue({ id: "asset-generated", name: "generated.png", type: "image", url: "user/image/generated.png", createdAt: new Date("2026-09-19T09:00:00.000Z") });
    mocks.historyCreate.mockResolvedValue({ id: "history-generated" });
    mocks.finalizeUsage.mockResolvedValue({ status: "succeeded" });
    mocks.refundUsage.mockResolvedValue({ status: "refunded" });
    mocks.usageFindFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        asset: { create: mocks.assetCreate },
        historyRecord: { create: mocks.historyCreate, findFirst: mocks.txFindFirst, updateMany: mocks.txUpdateMany },
      }),
    );
  });

  it.each(["HERO", "USAGE_SCENE", "BRAND_CONTENT"] as const)("allows READY visual module %s", (moduleType) => {
    expect(assertDetailPageSectionGenerationEligibility(sectionFor(makeProject(), moduleType))).toMatchObject({ moduleType });
  });

  it("allows BENEFITS only with verified evidence", () => {
    const project = makeProject();
    expect(() => assertDetailPageSectionGenerationEligibility(sectionFor(project, "BENEFITS"))).toThrow(/补充并确认/);
    const confirmed = withConfirmedEvidence(project, "BENEFITS");
    expect(assertDetailPageSectionGenerationEligibility(sectionFor(confirmed, "BENEFITS"))).toMatchObject({ readiness: "READY" });
  });

  it("blocks PRODUCT_DETAIL when reference evidence is insufficient", () => {
    expect(() => assertDetailPageSectionGenerationEligibility(sectionFor(makeProject(), "PRODUCT_DETAIL"))).toThrow(/补充并确认/);
  });

  it.each(["USAGE_GUIDE", "SPECS"] as const)("rejects unsupported module %s before generation", (moduleType) => {
    expect(() => assertDetailPageSectionGenerationEligibility(sectionFor(makeProject(), moduleType))).toThrow(/不需要生成视觉/);
  });

  it("rejects stale revision before writing", async () => {
    const project = { ...makeProject(), revision: 3 };
    mocks.findFirst.mockResolvedValue({ output: project });

    await expect(prepareDetailPageSectionGeneration({ analysisHistoryId: "analysis-1", expectedRevision: 2, sectionId: "section-1", userId: "user-1" })).rejects.toMatchObject({ status: 409 });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("denies a second generation while the project is busy", async () => {
    const project = withGeneration(makeProject());
    mocks.findFirst.mockResolvedValue({ output: project });

    await expect(prepareDetailPageSectionGeneration({ analysisHistoryId: "analysis-1", expectedRevision: project.revision, sectionId: "section-3", userId: "user-1" })).rejects.toMatchObject({ status: 409 });
  });

  it("starts only the target section and preserves an existing binding", async () => {
    const project = applyDetailPageProjectOperation(makeProject(), { type: "bind-asset", sectionId: "section-1", assetId: "asset-old" });
    mocks.findFirst.mockResolvedValue({ output: project });

    const next = await beginDetailPageSectionGeneration({
      analysisHistoryId: "analysis-1",
      expectedRevision: project.revision,
      generationOperationId: "operation-1",
      requestId: "request-1",
      sectionId: "section-1",
      userId: "user-1",
    });

    expect(next.sections[0]).toMatchObject({ lifecycle: "GENERATING", selectedAssetId: "asset-old", generationOperationId: "operation-1", generationRequestId: "request-1" });
    expect(next.sections[0].generationStartedAt).toEqual(expect.any(String));
    expect(next.sections[1]).toEqual(project.sections[1]);
  });

  it("marks an initial failure without mutating unrelated sections", async () => {
    const project = withGeneration(makeProject());
    mocks.findFirst.mockResolvedValue({ output: project });

    const next = await failDetailPageSectionGeneration({ analysisHistoryId: "analysis-1", generationOperationId: "operation-1", sectionId: "section-1", userId: "user-1" });

    expect(next?.sections[0]).toMatchObject({ lifecycle: "FAILED", selectedAssetId: null, generationOperationId: null });
    expect(next?.sections[0].lastError).not.toContain("provider");
    expect(next?.sections[1]).toEqual(project.sections[1]);
  });

  it("keeps the previous asset complete when regenerate fails", async () => {
    const project = withGeneration(makeProject(), "section-1", "asset-old");
    mocks.findFirst.mockResolvedValue({ output: project });

    const next = await failDetailPageSectionGeneration({ analysisHistoryId: "analysis-1", generationOperationId: "operation-1", sectionId: "section-1", userId: "user-1" });

    expect(next?.sections[0]).toMatchObject({ lifecycle: "COMPLETE", selectedAssetId: "asset-old", generationOperationId: null });
  });

  it("ignores a stale failure operation token", async () => {
    const project = withGeneration(makeProject());
    mocks.findFirst.mockResolvedValue({ output: project });

    await expect(failDetailPageSectionGeneration({ analysisHistoryId: "analysis-1", generationOperationId: "stale", sectionId: "section-1", userId: "user-1" })).resolves.toBeNull();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("atomically creates Asset, History, and the generated binding", async () => {
    const project = withGeneration(makeProject());
    mocks.txFindFirst.mockResolvedValue({ output: project });

    const result = await persistGeneratedDetailPageSection({
      analysisHistoryId: "analysis-1",
      assetName: "generated.png",
      assetStoragePath: "user/image/generated.png",
      generationOperationId: "operation-1",
      historyInput: { source: "detail-page-v2", requestId: "request-1" },
      historyOutput: { source: "detail-page-v2" },
      historyTitle: "测试详情页模块",
      requestId: "request-1",
      sectionId: "section-1",
      userId: "user-1",
    });

    expect(result.project.sections[0]).toMatchObject({ assetSource: "generated", lifecycle: "COMPLETE", selectedAssetId: "asset-generated", generationOperationId: null });
    expect(result.project.sections[1]).toEqual(project.sections[1]);
    expect(mocks.historyCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ assetId: "asset-generated", type: "image", userId: "user-1" }) });
    expect(mocks.txUpdateMany).toHaveBeenCalledOnce();
  });

  it("rejects stale settlement before creating persistent rows", async () => {
    const project = withGeneration(makeProject());
    project.sections[0].generationOperationId = "newer-operation";
    mocks.txFindFirst.mockResolvedValue({ output: project });

    await expect(persistGeneratedDetailPageSection({
      analysisHistoryId: "analysis-1",
      assetName: "generated.png",
      assetStoragePath: "user/image/generated.png",
      generationOperationId: "operation-1",
      historyInput: {},
      historyOutput: {},
      historyTitle: "测试",
      requestId: "request-1",
      sectionId: "section-1",
      userId: "user-1",
    })).rejects.toMatchObject({ status: 409 });
    expect(mocks.assetCreate).not.toHaveBeenCalled();
    expect(mocks.historyCreate).not.toHaveBeenCalled();
  });

  it("fails the transaction when the project compare-and-swap loses a race", async () => {
    const project = withGeneration(makeProject());
    mocks.txFindFirst.mockResolvedValue({ output: project });
    mocks.txUpdateMany.mockResolvedValue({ count: 0 });

    await expect(persistGeneratedDetailPageSection({
      analysisHistoryId: "analysis-1",
      assetName: "generated.png",
      assetStoragePath: "user/image/generated.png",
      generationOperationId: "operation-1",
      historyInput: {},
      historyOutput: {},
      historyTitle: "测试",
      requestId: "request-1",
      sectionId: "section-1",
      userId: "user-1",
    })).rejects.toMatchObject({ status: 409 });
  });

  it("recovers a completed result by stable requestId", async () => {
    const project = withGeneration(makeProject(), "section-1", "asset-generated");
    project.sections[0] = { ...project.sections[0], lifecycle: "COMPLETE", generationOperationId: null };
    mocks.findFirst.mockResolvedValue({ output: project });

    await expect(recoverGeneratedDetailPageSection({ analysisHistoryId: "analysis-1", requestId: "request-1", sectionId: "section-1", userId: "user-1" })).resolves.toEqual({ assetId: "asset-generated", project });
  });

  it("does not recover a result for another request or section", async () => {
    const project = withGeneration(makeProject(), "section-1", "asset-generated");
    project.sections[0] = { ...project.sections[0], lifecycle: "COMPLETE", generationOperationId: null };
    mocks.findFirst.mockResolvedValue({ output: project });

    await expect(recoverGeneratedDetailPageSection({ analysisHistoryId: "analysis-1", requestId: "request-other", sectionId: "section-1", userId: "user-1" })).resolves.toBeNull();
  });

  it("does not reconcile a fresh generation", async () => {
    const project = withGeneration(makeProject());

    await expect(reconcileStaleDetailPageGeneration({ analysisHistoryId: "analysis-1", project, userId: "user-1" })).resolves.toEqual(project);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.usageFindFirst).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("refunds stale pending Usage before releasing an initial generation", async () => {
    const startedAt = new Date(Date.now() - DETAIL_PAGE_GENERATION_STALE_MS - 1).toISOString();
    const project = withGeneration(makeProject(), "section-1", null, startedAt);
    mocks.findFirst.mockResolvedValue(null);
    mocks.usageFindFirst.mockResolvedValue({ id: "usage-1", status: "pending" });

    const next = await reconcileStaleDetailPageGeneration({ analysisHistoryId: "analysis-1", project, userId: "user-1" });

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ usageRecordId: "usage-1", userId: "user-1" }));
    expect(next.sections[0]).toMatchObject({ lifecycle: "FAILED", selectedAssetId: null, generationOperationId: null, generationStartedAt: null });
    expect(next.revision).toBe(project.revision + 1);
    expect(mocks.assetCreate).not.toHaveBeenCalled();
    expect(mocks.historyCreate).not.toHaveBeenCalled();
  });

  it("preserves the previous Asset when a stale regenerate is interrupted", async () => {
    const startedAt = new Date(Date.now() - DETAIL_PAGE_GENERATION_STALE_MS - 1).toISOString();
    const project = withGeneration(makeProject(), "section-1", "asset-old", startedAt);
    mocks.findFirst.mockResolvedValue(null);

    const next = await reconcileStaleDetailPageGeneration({ analysisHistoryId: "analysis-1", project, userId: "user-1" });

    expect(next.sections[0]).toMatchObject({ lifecycle: "COMPLETE", selectedAssetId: "asset-old", generationOperationId: null });
  });

  it("recovers a durable result and settles pending Usage without generating again", async () => {
    const startedAt = new Date(Date.now() - DETAIL_PAGE_GENERATION_STALE_MS - 1).toISOString();
    const project = withGeneration(makeProject(), "section-1", null, startedAt);
    mocks.findFirst.mockResolvedValue({ id: "history-generated", assetId: "asset-generated" });
    mocks.usageFindFirst.mockResolvedValue({ id: "usage-1", status: "pending" });

    const next = await reconcileStaleDetailPageGeneration({ analysisHistoryId: "analysis-1", project, userId: "user-1" });

    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({ usageRecordId: "usage-1", userId: "user-1" }));
    expect(next.sections[0]).toMatchObject({ lifecycle: "COMPLETE", selectedAssetId: "asset-generated", generationOperationId: null });
    expect(mocks.assetCreate).not.toHaveBeenCalled();
    expect(mocks.historyCreate).not.toHaveBeenCalled();
  });

  it("keeps the project locked when Usage reconciliation fails", async () => {
    const startedAt = new Date(Date.now() - DETAIL_PAGE_GENERATION_STALE_MS - 1).toISOString();
    const project = withGeneration(makeProject(), "section-1", null, startedAt);
    mocks.findFirst.mockResolvedValue(null);
    mocks.usageFindFirst.mockResolvedValue({ id: "usage-1", status: "pending" });
    mocks.refundUsage.mockRejectedValue(new Error("ledger unavailable"));

    const next = await reconcileStaleDetailPageGeneration({ analysisHistoryId: "analysis-1", project, userId: "user-1" });

    expect(next).toEqual(project);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("keeps the project locked when Usage succeeded but no durable result exists", async () => {
    const startedAt = new Date(Date.now() - DETAIL_PAGE_GENERATION_STALE_MS - 1).toISOString();
    const project = withGeneration(makeProject(), "section-1", null, startedAt);
    mocks.findFirst.mockResolvedValue(null);
    mocks.usageFindFirst.mockResolvedValue({ id: "usage-1", status: "succeeded" });

    const next = await reconcileStaleDetailPageGeneration({ analysisHistoryId: "analysis-1", project, userId: "user-1" });

    expect(next).toEqual(project);
    expect(mocks.refundUsage).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("is idempotent after stale recovery has released the operation", async () => {
    const startedAt = new Date(Date.now() - DETAIL_PAGE_GENERATION_STALE_MS - 1).toISOString();
    const project = withGeneration(makeProject(), "section-1", null, startedAt);
    mocks.findFirst.mockResolvedValue(null);
    mocks.usageFindFirst.mockResolvedValue({ id: "usage-1", status: "pending" });

    const recovered = await reconcileStaleDetailPageGeneration({ analysisHistoryId: "analysis-1", project, userId: "user-1" });
    const repeated = await reconcileStaleDetailPageGeneration({ analysisHistoryId: "analysis-1", project: recovered, userId: "user-1" });

    expect(repeated).toEqual(recovered);
    expect(mocks.refundUsage).toHaveBeenCalledOnce();
    expect(mocks.updateMany).toHaveBeenCalledOnce();
  });
});
