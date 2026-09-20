import {
  applyDetailPageProjectOperation,
  createFallbackDetailPageProject,
  getDetailPageSectionCompletion,
  type DetailPageModuleType,
  type DetailPageProjectV2,
} from "@/lib/detail-page-project";
import { getDetailPageSectionExportBlockers } from "@/lib/detail-page-export";
import { buildDetailPagePreview } from "@/lib/detail-page-preview";
import { describe, expect, it } from "vitest";

function createProject() {
  let id = 0;
  return createFallbackDetailPageProject({
    analysisHistoryId: "analysis-1",
    idFactory: () => `section-${++id}`,
    projectId: "project-1",
    sectionCount: 7,
    sourceAssetId: "source-asset",
    userId: "user-1",
  });
}

function sectionFor(project: DetailPageProjectV2, moduleType: DetailPageModuleType) {
  return project.sections.find((section) => section.moduleType === moduleType)!;
}

function completeTextSection(project: DetailPageProjectV2, moduleType: "USAGE_GUIDE" | "SPECS") {
  const section = sectionFor(project, moduleType);
  const withEvidence = applyDetailPageProjectOperation(project, { type: "set-evidence", sectionId: section.id, value: "人工确认内容" });
  return applyDetailPageProjectOperation(withEvidence, { type: "set-copy", sectionId: section.id, headline: "确认标题", body: "确认正文" });
}

describe("Detail Page V2 canonical effective completion", () => {
  it.each(["USAGE_GUIDE", "SPECS"] as const)("treats verified %s copy as complete without forcing an image", (moduleType) => {
    const project = completeTextSection(createProject(), moduleType);
    const section = sectionFor(project, moduleType);

    expect(section.lifecycle).toBe("PLANNED");
    expect(getDetailPageSectionCompletion(section)).toMatchObject({ complete: true, requiresAsset: false, requiresCopy: true });
    expect(getDetailPageSectionExportBlockers(section)).toEqual([]);
    expect(buildDetailPagePreview(project, []).visible.find((item) => item.section.id === section.id)?.state).toBe("complete");
  });

  it("keeps BENEFITS incomplete without verified evidence even when copy exists", () => {
    const project = createProject();
    const benefits = sectionFor(project, "BENEFITS");
    const withCopy = applyDetailPageProjectOperation(project, { type: "set-copy", sectionId: benefits.id, headline: "卖点", body: "卖点正文" });

    expect(getDetailPageSectionCompletion(sectionFor(withCopy, "BENEFITS"))).toMatchObject({ complete: false, readiness: "NEEDS_INPUT" });
  });

  it("requires a product-scoped Asset for visual completion", () => {
    const project = createProject();
    const hero = sectionFor(project, "HERO");

    expect(getDetailPageSectionCompletion(hero)).toMatchObject({ complete: false, requiresAsset: true });

    const bound = applyDetailPageProjectOperation(project, { type: "bind-asset", sectionId: hero.id, assetId: "asset-hero" });
    const boundHero = sectionFor(bound, "HERO");
    expect(getDetailPageSectionCompletion(boundHero, true).complete).toBe(true);
    expect(getDetailPageSectionCompletion(boundHero, false).complete).toBe(false);
  });

  it("does not let NEEDS_INPUT appear complete", () => {
    const specs = sectionFor(createProject(), "SPECS");
    specs.copy = { headline: "规格", body: "未经确认的规格" };

    expect(getDetailPageSectionCompletion(specs)).toMatchObject({ complete: false, readiness: "NEEDS_INPUT" });
  });

  it("requires an Asset for the visual BENEFITS layout but not the text-led layout", () => {
    let project = createProject();
    const benefits = sectionFor(project, "BENEFITS");
    project = applyDetailPageProjectOperation(project, { type: "set-evidence", sectionId: benefits.id, value: "人工确认卖点" });
    project = applyDetailPageProjectOperation(project, { type: "set-copy", sectionId: benefits.id, headline: "核心卖点", body: "真实卖点正文" });
    expect(getDetailPageSectionCompletion(sectionFor(project, "BENEFITS"))).toMatchObject({ complete: true, requiresAsset: false });

    project = applyDetailPageProjectOperation(project, { type: "set-layout", sectionId: benefits.id, layout: "SPLIT" });
    expect(getDetailPageSectionCompletion(sectionFor(project, "BENEFITS"))).toMatchObject({ complete: false, requiresAsset: true });
  });
});
