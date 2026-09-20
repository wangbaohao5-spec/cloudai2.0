import {
  DETAIL_PAGE_DEFAULT_LAYOUTS,
  DETAIL_PAGE_LAYOUT_VARIANTS,
  applyDetailPageProjectOperation,
  createFallbackDetailPageProject,
  parseDetailPageProject,
  type DetailPageAssetCandidate,
  type DetailPageLifecycle,
  type DetailPageModuleType,
  type DetailPageReadiness,
} from "@/lib/detail-page-project";
import {
  DETAIL_PAGE_LOGICAL_WIDTH,
  buildDetailPagePreview,
  getDetailPagePreviewState,
  getDetailPageStyleClass,
  getNextDetailPageLayout,
} from "@/lib/detail-page-preview";
import { describe, expect, it } from "vitest";

function createProject() {
  let id = 0;
  return createFallbackDetailPageProject({
    analysisHistoryId: "analysis-1",
    idFactory: () => `section-${++id}`,
    now: new Date("2026-09-20T08:00:00.000Z"),
    projectId: "project-1",
    sectionCount: 7,
    sourceAssetId: "source-asset",
    userId: "user-1",
  });
}

function candidate(assetId: string, previewUrl: string | null = "https://example.test/preview") {
  return {
    assetId,
    assetType: "image",
    createdAt: "2026-09-20T08:00:00.000Z",
    historyId: "history-1",
    imageType: "hero",
    name: "商品视觉",
    previewUrl,
    productRelationEvidence: "history-analysis-id",
    sourceType: "detail-page",
    suggestedModuleTypes: ["HERO"],
  } satisfies DetailPageAssetCandidate;
}

const defaults = Object.entries(DETAIL_PAGE_DEFAULT_LAYOUTS) as Array<[DetailPageModuleType, string]>;

describe("Detail Page V2 continuous preview", () => {
  it.each(defaults)("uses the deterministic %s default layout", (moduleType, layout) => {
    expect(DETAIL_PAGE_LAYOUT_VARIANTS[moduleType]).toContain(layout);
    expect(createProject().sections.find((section) => section.moduleType === moduleType)?.layout).toBe(layout);
  });

  it("normalizes an old project with missing layouts during recovery", () => {
    const project = createProject();
    const oldProject = {
      ...project,
      sections: project.sections.map((section) => ({ ...section, layout: undefined })),
    };

    expect(parseDetailPageProject(oldProject)?.sections.map((section) => section.layout)).toEqual(
      project.sections.map((section) => DETAIL_PAGE_DEFAULT_LAYOUTS[section.moduleType]),
    );
  });

  it("persists a supported layout change without touching assets", () => {
    const project = createProject();
    const hero = project.sections[0];
    const next = applyDetailPageProjectOperation(project, { type: "set-layout", sectionId: hero.id, layout: "SPLIT" });

    expect(next.sections[0].layout).toBe("SPLIT");
    expect(next.sections[0].selectedAssetId).toBe(hero.selectedAssetId);
    expect(parseDetailPageProject(next)?.sections[0].layout).toBe("SPLIT");
  });

  it("rejects a layout that belongs to another module", () => {
    const project = createProject();
    expect(() => applyDetailPageProjectOperation(project, { type: "set-layout", sectionId: project.sections[0].id, layout: "STEP_TEXT" })).toThrow("当前模块不支持该版式");
  });

  it("cycles only through the current module variants", () => {
    expect(getNextDetailPageLayout("HERO", "FULL_VISUAL")).toBe("SPLIT");
    expect(getNextDetailPageLayout("HERO", "SPLIT")).toBe("FULL_VISUAL");
  });

  it("omits hidden sections from the finished preview", () => {
    const project = createProject();
    const next = applyDetailPageProjectOperation(project, { type: "set-hidden", sectionId: project.sections[0].id, hidden: true });
    const preview = buildDetailPagePreview(next, []);

    expect(preview.visible).toHaveLength(6);
    expect(preview.hidden.map((item) => item.section.id)).toEqual([project.sections[0].id]);
  });

  it("shows a hidden section again at its original order", () => {
    const project = createProject();
    const hidden = applyDetailPageProjectOperation(project, { type: "set-hidden", sectionId: project.sections[1].id, hidden: true });
    const shown = applyDetailPageProjectOperation(hidden, { type: "set-hidden", sectionId: project.sections[1].id, hidden: false });

    expect(buildDetailPagePreview(shown, []).visible[1].section.id).toBe(project.sections[1].id);
  });

  it("round-trips hidden assembly state through persisted JSON", () => {
    const project = createProject();
    const hidden = applyDetailPageProjectOperation(project, { type: "set-hidden", sectionId: project.sections[2].id, hidden: true });

    expect(parseDetailPageProject(hidden)?.sections[2].hidden).toBe(true);
  });

  it("deletes only the project reference and leaves other asset bindings untouched", () => {
    const project = createProject();
    project.sections[0] = { ...project.sections[0], selectedAssetId: "asset-a", assetSource: "generated", lifecycle: "COMPLETE" };
    project.sections[1] = { ...project.sections[1], selectedAssetId: "asset-b", assetSource: "existing-asset" };
    const next = applyDetailPageProjectOperation(project, { type: "delete-section", sectionId: project.sections[0].id });

    expect(next.sections.some((section) => section.id === project.sections[0].id)).toBe(false);
    expect(next.sections[0].selectedAssetId).toBe("asset-b");
  });

  it("uses project order as the preview order", () => {
    const project = createProject();
    const moved = applyDetailPageProjectOperation(project, { type: "move-section", sectionId: project.sections[1].id, direction: "up" });

    expect(buildDetailPagePreview(moved, []).visible.slice(0, 2).map((item) => item.section.id)).toEqual(["section-2", "section-1"]);
  });

  it("uses persisted copy in the preview model", () => {
    const project = createProject();
    const next = applyDetailPageProjectOperation(project, { type: "set-copy", sectionId: project.sections[0].id, headline: "新标题", body: "新正文" });

    expect(buildDetailPagePreview(next, []).visible[0].section.copy).toEqual({ headline: "新标题", body: "新正文" });
  });

  it("resolves the selected replacement asset without persisting its signed URL", () => {
    const project = createProject();
    const bound = applyDetailPageProjectOperation(project, { type: "bind-asset", sectionId: project.sections[0].id, assetId: "asset-a" });
    const preview = buildDetailPagePreview(bound, [candidate("asset-a")]);

    expect(preview.visible[0].asset?.assetId).toBe("asset-a");
    expect(JSON.stringify(bound)).not.toContain("example.test");
  });

  it("soft-fails a missing preview URL without dropping the binding", () => {
    const project = createProject();
    const bound = applyDetailPageProjectOperation(project, { type: "bind-asset", sectionId: project.sections[0].id, assetId: "asset-a" });
    const preview = buildDetailPagePreview(bound, [candidate("asset-a", null)]);

    expect(preview.visible[0].missingPreview).toBe(true);
    expect(preview.visible[0].section.selectedAssetId).toBe("asset-a");
  });

  it.each([
    ["COMPLETE", "READY", "complete"],
    ["PLANNED", "READY", "planned"],
    ["PLANNED", "NEEDS_INPUT", "needs-input"],
    ["FAILED", "READY", "failed"],
    ["GENERATING", "READY", "generating"],
  ] as Array<[DetailPageLifecycle, DetailPageReadiness, string]>)("maps %s/%s to %s", (lifecycle, readiness, state) => {
    const section = { ...createProject().sections[0], lifecycle, readiness };
    expect(getDetailPagePreviewState(section)).toBe(state);
  });

  it("keeps assembly mutations pure and free of usage metadata", () => {
    const project = createProject();
    const generationMetadata = project.sections.map((section) => ({
      generationOperationId: section.generationOperationId,
      generationRequestId: section.generationRequestId,
    }));
    const operations = [
      { type: "set-layout", sectionId: "section-1", layout: "SPLIT" },
      { type: "set-hidden", sectionId: "section-1", hidden: true },
      { type: "move-section", sectionId: "section-1", direction: "down" },
      { type: "set-copy", sectionId: "section-1", headline: "标题", body: "正文" },
    ] as const;
    const next = operations.reduce((current, operation) => applyDetailPageProjectOperation(current, operation), project);

    expect(Object.keys(next)).not.toContain("usage");
    expect(Object.keys(next)).not.toContain("provider");
    expect(next.sections.map((section) => ({
      generationOperationId: section.generationOperationId,
      generationRequestId: section.generationRequestId,
    }))).toEqual(generationMetadata);
  });

  it("restores order, visibility, layout, copy, and asset selection after refresh", () => {
    let project = createProject();
    project = applyDetailPageProjectOperation(project, { type: "bind-asset", sectionId: "section-1", assetId: "asset-a" });
    project = applyDetailPageProjectOperation(project, { type: "set-layout", sectionId: "section-1", layout: "SPLIT" });
    project = applyDetailPageProjectOperation(project, { type: "set-copy", sectionId: "section-1", headline: "标题", body: "正文" });
    project = applyDetailPageProjectOperation(project, { type: "set-hidden", sectionId: "section-2", hidden: true });
    project = applyDetailPageProjectOperation(project, { type: "move-section", sectionId: "section-1", direction: "down" });
    const recovered = parseDetailPageProject(JSON.parse(JSON.stringify(project)))!;

    expect(recovered.sections[1]).toMatchObject({ id: "section-1", layout: "SPLIT", selectedAssetId: "asset-a", copy: { headline: "标题", body: "正文" } });
    expect(recovered.sections[0]).toMatchObject({ id: "section-2", hidden: true });
  });

  it("maps every page style to a bounded class and freezes the logical width", () => {
    expect(["is-ecommerce", "is-brand-site", "is-minimal", "is-xiaohongshu"]).toEqual([
      getDetailPageStyleClass("ecommerce"),
      getDetailPageStyleClass("brand-site"),
      getDetailPageStyleClass("minimal"),
      getDetailPageStyleClass("xiaohongshu"),
    ]);
    expect(DETAIL_PAGE_LOGICAL_WIDTH).toBe(1200);
  });
});
