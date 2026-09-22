import {
  applyDetailPageProjectOperation,
  canBindExistingAssetToModule,
  createDetailPageProject,
  createFallbackDetailPageProject,
  DetailPageProjectError,
  DETAIL_PAGE_MODULE_TYPES,
  evaluateDetailPageReadiness,
  getDetailPageSectionEffectiveState,
  parseDetailPageProject,
} from "@/lib/detail-page-project";
import { describe, expect, it } from "vitest";

function idFactory() {
  let index = 0;
  return () => `section-${++index}`;
}

function createProject(sectionCount = 7) {
  return createFallbackDetailPageProject({
    analysisHistoryId: "analysis-1",
    idFactory: idFactory(),
    now: new Date("2026-09-19T00:00:00.000Z"),
    projectId: "project-1",
    sectionCount,
    sourceAssetId: "asset-source",
    userId: "user-1",
  });
}

describe("Detail Page V2 project contract", () => {
  it("creates and validates a versioned project with stable section ids", () => {
    const project = createProject();
    const parsed = parseDetailPageProject(project, { userId: "user-1", analysisHistoryId: "analysis-1" });

    expect(parsed).toEqual(project);
    expect(project.version).toBe(2);
    expect(project.revision).toBe(1);
    expect(project.sections.map((section) => section.id)).toEqual([
      "section-1",
      "section-2",
      "section-3",
      "section-4",
      "section-5",
      "section-6",
      "section-7",
    ]);
  });

  it("normalizes provider output to the frozen taxonomy and requested bounds", () => {
    const project = createDetailPageProject({
      analysisHistoryId: "analysis-1",
      candidate: {
        sections: [
          { moduleType: "HERO", purpose: "首屏" },
          { moduleType: "UNSUPPORTED" },
          { moduleType: "HERO", purpose: "重复首屏" },
        ],
      },
      idFactory: idFactory(),
      projectId: "project-1",
      sectionCount: 99,
      sourceAssetId: "asset-source",
      userId: "user-1",
    });

    expect(project.sections).toHaveLength(8);
    expect(project.sections.every((section) => DETAIL_PAGE_MODULE_TYPES.includes(section.moduleType))).toBe(true);
    expect(project.sections.map((section) => String(section.moduleType))).not.toContain("UNSUPPORTED");
    expect(project.sections.map((section) => section.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("normalizes a short provider plan to at least five sections", () => {
    expect(createProject(1).sections).toHaveLength(5);
  });

  it("does not promote AI analysis or a product image to verified Hybrid or Fact evidence", () => {
    const project = createProject();
    const benefits = project.sections.find((section) => section.moduleType === "BENEFITS");
    const usageGuide = project.sections.find((section) => section.moduleType === "USAGE_GUIDE");
    const specs = project.sections.find((section) => section.moduleType === "SPECS");

    expect(benefits?.readiness).toBe("NEEDS_INPUT");
    expect(usageGuide?.readiness).toBe("NEEDS_INPUT");
    expect(specs?.readiness).toBe("NEEDS_INPUT");
    expect(benefits?.evidence).toEqual([
      expect.objectContaining({ sourceType: "product-image", verifiedByUser: false }),
    ]);
  });

  it("marks visual modules ready from the owned product image but keeps product detail conservative", () => {
    const project = createProject();

    expect(project.sections.find((section) => section.moduleType === "HERO")?.readiness).toBe("READY");
    expect(project.sections.find((section) => section.moduleType === "USAGE_SCENE")?.readiness).toBe("READY");
    expect(project.sections.find((section) => section.moduleType === "BRAND_CONTENT")?.readiness).toBe("READY");
    expect(project.sections.find((section) => section.moduleType === "PRODUCT_DETAIL")?.readiness).toBe("NEEDS_INPUT");
  });

  it("moves, deletes and adds sections without changing retained ids", () => {
    const project = createProject();
    const originalIds = project.sections.map((section) => section.id);
    const moved = applyDetailPageProjectOperation(project, {
      type: "move-section",
      sectionId: originalIds[1],
      direction: "up",
    });
    const deleted = applyDetailPageProjectOperation(moved, {
      type: "delete-section",
      sectionId: originalIds[2],
    });
    const added = applyDetailPageProjectOperation(
      deleted,
      { type: "add-section", moduleType: "PRODUCT_DETAIL" },
      { idFactory: () => "section-new" },
    );

    expect(moved.sections.slice(0, 2).map((section) => section.id)).toEqual([originalIds[1], originalIds[0]]);
    expect(deleted.sections.some((section) => section.id === originalIds[2])).toBe(false);
    expect(added.sections.at(-1)?.id).toBe("section-new");
    expect(added.sections.map((section) => section.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("replaces a module while retaining the stable section id", () => {
    const project = createProject();
    const target = project.sections[1];
    const replaced = applyDetailPageProjectOperation(project, {
      type: "replace-module",
      sectionId: target.id,
      moduleType: "SPECS",
    });

    expect(replaced.sections[1].id).toBe(target.id);
    expect(replaced.sections[1].moduleType).toBe("SPECS");
    expect(replaced.sections[1].readiness).toBe("NEEDS_INPUT");
  });

  it("persists user-confirmed facts and recomputes readiness", () => {
    const project = createProject();
    const specs = project.sections.find((section) => section.moduleType === "SPECS")!;
    const updated = applyDetailPageProjectOperation(project, {
      type: "set-evidence",
      sectionId: specs.id,
      value: "容量由用户确认，以商品包装标注为准。",
    });
    const nextSpecs = updated.sections.find((section) => section.id === specs.id)!;

    expect(nextSpecs.readiness).toBe("READY");
    expect(nextSpecs.evidence).toContainEqual(
      expect.objectContaining({ sourceType: "user-confirmed", verifiedByUser: true }),
    );
    expect(evaluateDetailPageReadiness("SPECS", nextSpecs.evidence)).toBe("READY");
  });

  it("enforces manual section minimum and maximum", () => {
    let project = createProject(5);
    project = applyDetailPageProjectOperation(project, { type: "delete-section", sectionId: project.sections[0].id });
    project = applyDetailPageProjectOperation(project, { type: "delete-section", sectionId: project.sections[0].id });

    expect(() => applyDetailPageProjectOperation(project, { type: "delete-section", sectionId: project.sections[0].id })).toThrow(DetailPageProjectError);

    const fullProject = createProject(8);
    expect(() => applyDetailPageProjectOperation(fullProject, { type: "add-section", moduleType: "HERO" })).toThrow(DetailPageProjectError);
  });

  it("rejects malformed project JSON without throwing", () => {
    const malformed = { ...createProject(), sections: [{ id: "bad", moduleType: "UNKNOWN" }] };

    expect(parseDetailPageProject(malformed)).toBeNull();
    expect(parseDetailPageProject({ version: 2, revision: 1 })).toBeNull();
  });

  it("keeps old project JSON compatible when generation intent and attempt metadata are absent", () => {
    const project = createProject();
    const newerFields = new Set([
      "generationIntent",
      "generationStartedAt",
      "lastGenerationOutcome",
      "lastGenerationRequestId",
      "lastGenerationSettledAt",
      "lastGenerationStartedAt",
    ]);
    const legacy = {
      ...project,
      sections: project.sections.map((section) => Object.fromEntries(Object.entries(section).filter(([key]) => !newerFields.has(key)))),
    };

    expect(parseDetailPageProject(legacy)?.sections).toEqual(project.sections.map((section) => ({
      ...section,
      generationIntent: null,
      generationStartedAt: null,
      lastGenerationOutcome: null,
      lastGenerationRequestId: null,
      lastGenerationSettledAt: null,
      lastGenerationStartedAt: null,
    })));
  });

  it("binds and replaces an existing visual asset without persisting a signed URL", () => {
    const project = createProject();
    const hero = project.sections.find((section) => section.moduleType === "HERO")!;
    const bound = applyDetailPageProjectOperation(project, { type: "bind-asset", sectionId: hero.id, assetId: "asset-a" });
    const replaced = applyDetailPageProjectOperation(bound, { type: "bind-asset", sectionId: hero.id, assetId: "asset-b" });
    const nextHero = replaced.sections.find((section) => section.id === hero.id)!;

    expect(nextHero).toMatchObject({
      assetSource: "existing-asset",
      lifecycle: "COMPLETE",
      readiness: "EXISTING_ASSET",
      selectedAssetId: "asset-b",
    });
    expect(parseDetailPageProject(replaced)?.sections.find((section) => section.id === hero.id)?.selectedAssetId).toBe("asset-b");
    expect(JSON.stringify(replaced)).not.toContain("signedUrl");
    expect(JSON.stringify(replaced)).not.toContain("previewUrl");
  });

  it("unbinds an asset without deleting evidence or the section", () => {
    const project = createProject();
    const hero = project.sections.find((section) => section.moduleType === "HERO")!;
    const bound = applyDetailPageProjectOperation(project, { type: "bind-asset", sectionId: hero.id, assetId: "asset-a" });
    const unbound = applyDetailPageProjectOperation(bound, { type: "unbind-asset", sectionId: hero.id });
    const nextHero = unbound.sections.find((section) => section.id === hero.id)!;

    expect(nextHero.id).toBe(hero.id);
    expect(nextHero.selectedAssetId).toBeNull();
    expect(nextHero.assetSource).toBeNull();
    expect(nextHero.readiness).toBe("READY");
    expect(nextHero.lifecycle).toBe("PLANNED");
  });

  it("keeps BENEFITS blocked without verified evidence after asset binding", () => {
    const project = createProject();
    const benefits = project.sections.find((section) => section.moduleType === "BENEFITS")!;
    const bound = applyDetailPageProjectOperation(project, { type: "bind-asset", sectionId: benefits.id, assetId: "asset-a" });
    const nextBenefits = bound.sections.find((section) => section.id === benefits.id)!;

    expect(nextBenefits.selectedAssetId).toBe("asset-a");
    expect(nextBenefits.readiness).toBe("NEEDS_INPUT");
    expect(nextBenefits.lifecycle).toBe("PLANNED");
  });

  it("does not let an image satisfy SPECS and rejects unsupported binding modules", () => {
    const project = createProject();
    const specs = project.sections.find((section) => section.moduleType === "SPECS")!;

    expect(canBindExistingAssetToModule("SPECS")).toBe(false);
    expect(evaluateDetailPageReadiness("SPECS", specs.evidence, "asset-a")).toBe("NEEDS_INPUT");
    expect(() => applyDetailPageProjectOperation(project, { type: "bind-asset", sectionId: specs.id, assetId: "asset-a" })).toThrow(DetailPageProjectError);
  });

  it("softly recomputes state when a selected asset becomes unavailable", () => {
    const project = createProject();
    const hero = project.sections.find((section) => section.moduleType === "HERO")!;
    const bound = applyDetailPageProjectOperation(project, { type: "bind-asset", sectionId: hero.id, assetId: "asset-a" });
    const boundHero = bound.sections.find((section) => section.id === hero.id)!;

    expect(getDetailPageSectionEffectiveState(boundHero, false)).toMatchObject({ complete: false, readiness: "READY", lifecycle: "PLANNED" });
    expect(boundHero.selectedAssetId).toBe("asset-a");
  });

  it("persists manually edited structured copy", () => {
    const project = createProject();
    const section = project.sections[0];
    const updated = applyDetailPageProjectOperation(project, {
      type: "set-copy",
      sectionId: section.id,
      headline: "人工标题",
      body: "人工正文",
    });

    expect(updated.sections[0].copy).toEqual({ headline: "人工标题", body: "人工正文" });
    expect(parseDetailPageProject(updated)?.sections[0].copy).toEqual({ headline: "人工标题", body: "人工正文" });
  });

  it("round-trips generated binding metadata without stable signed URLs", () => {
    const project = createProject();
    const generated = {
      ...project,
      sections: project.sections.map((section, index) =>
        index === 0
          ? {
              ...section,
              assetSource: "generated" as const,
              generationOperationId: null,
              generationRequestId: "request-1",
              lifecycle: "COMPLETE" as const,
              selectedAssetId: "asset-generated",
            }
          : section,
      ),
    };

    expect(parseDetailPageProject(generated)?.sections[0]).toMatchObject({
      assetSource: "generated",
      generationRequestId: "request-1",
      selectedAssetId: "asset-generated",
    });
    expect(JSON.stringify(generated)).not.toContain("signedUrl");
  });
});
