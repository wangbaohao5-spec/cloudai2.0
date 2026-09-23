import {
  DETAIL_PAGE_COMPOSITION_TOKENS,
  getDetailPageComposition,
  isDetailPageCanonicalSourceSelected,
} from "@/lib/detail-page-composition";
import { createFallbackDetailPageProject, type DetailPageSectionV2 } from "@/lib/detail-page-project";
import { getDetailPageMediaRole } from "@/lib/detail-page-preview";
import { describe, expect, it } from "vitest";

function sections() {
  let id = 0;
  return createFallbackDetailPageProject({
    analysisHistoryId: "analysis-1",
    idFactory: () => `section-${++id}`,
    projectId: "project-1",
    sectionCount: 7,
    sourceAssetId: "source-asset",
    userId: "user-1",
  }).sections;
}

function withAsset(section: DetailPageSectionV2, assetId: string, assetSource: DetailPageSectionV2["assetSource"] = "existing-asset") {
  return { ...section, assetSource, selectedAssetId: assetId };
}

describe("Detail Page V2 composition contract", () => {
  it("keeps the shared 1200px composition tokens stable and bounded", () => {
    expect(DETAIL_PAGE_COMPOSITION_TOKENS.logicalWidth).toBe(1_200);
    expect(DETAIL_PAGE_COMPOSITION_TOKENS.gutter).toBeGreaterThanOrEqual(64);
    expect(DETAIL_PAGE_COMPOSITION_TOKENS.typography.heading.visual).toBeGreaterThan(DETAIL_PAGE_COMPOSITION_TOKENS.typography.body.visual * 2);
    expect(DETAIL_PAGE_COMPOSITION_TOKENS.textMaxWidth.standard).toBeLessThan(DETAIL_PAGE_COMPOSITION_TOKENS.logicalWidth / 2);
    expect(Object.values(DETAIL_PAGE_COMPOSITION_TOKENS.sectionPadding).every((value) => value >= 48 && value <= 96)).toBe(true);
  });

  it("frames a canonical source in Hero without changing its binding", () => {
    const hero = withAsset(sections()[0], "source-asset");
    expect(isDetailPageCanonicalSourceSelected(hero)).toBe(true);
    expect(getDetailPageComposition(hero)).toMatchObject({ canonicalSource: true, density: "visual", mediaTreatment: "source-framed" });
    expect(hero.selectedAssetId).toBe("source-asset");
  });

  it("keeps a generated Hero in the normal hero role", () => {
    const hero = withAsset(sections()[0], "generated-hero", "generated");
    expect(getDetailPageComposition(hero)).toMatchObject({ canonicalSource: false, mediaTreatment: "hero" });
  });

  it("maps text and fact modules to compact bounded compositions", () => {
    const [, benefits, , , guide, , specs] = sections();
    expect(getDetailPageComposition(benefits)).toMatchObject({ density: "compact", height: 400, surface: "alternate" });
    expect(getDetailPageComposition(guide)).toMatchObject({ density: "compact", height: 420 });
    expect(getDetailPageComposition(specs)).toMatchObject({ density: "compact", height: 340, surface: "muted" });
  });

  it("keeps visual modules distinct instead of inheriting the Hero scale", () => {
    const [hero, , scene, detail, , brand] = sections();
    expect(getDetailPageComposition(scene).height).toBeLessThan(getDetailPageComposition(hero).height);
    expect(getDetailPageComposition(brand)).toMatchObject({ density: "visual", height: 640, mediaTreatment: "editorial" });
    expect(getDetailPageComposition(detail)).toMatchObject({ density: "standard", height: 650, mediaTreatment: "detail" });
    expect(getDetailPageMediaRole(detail.moduleType)).toBe("detail");
  });
});
