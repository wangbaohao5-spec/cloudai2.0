import type { DetailPageLayout, DetailPageModuleType, DetailPageSectionV2 } from "@/lib/detail-page-project";

export type DetailPageCompositionDensity = "compact" | "standard" | "visual";
export type DetailPageCompositionSurface = "base" | "alternate" | "editorial" | "muted";
export type DetailPageMediaTreatment = "detail" | "editorial" | "hero" | "scene" | "source-framed" | "supporting";

export const DETAIL_PAGE_COMPOSITION_TOKENS = {
  logicalWidth: 1_200,
  gutter: 72,
  sectionPadding: {
    compact: 56,
    standard: 68,
    visual: 76,
  },
  sectionGap: {
    compact: 28,
    standard: 40,
    visual: 52,
  },
  typography: {
    eyebrow: 20,
    heading: {
      compact: 52,
      standard: 58,
      visual: 68,
    },
    body: {
      compact: 27,
      standard: 29,
      visual: 30,
    },
    supporting: 24,
  },
  textMaxWidth: {
    compact: 860,
    standard: 500,
    visual: 470,
  },
  mediaGap: 40,
  mediaRadius: 12,
} as const;

const SECTION_HEIGHTS: Record<DetailPageModuleType, Partial<Record<DetailPageLayout, number>>> = {
  HERO: { FULL_VISUAL: 860, SPLIT: 680 },
  BENEFITS: { TEXT_LED: 400, SPLIT: 580 },
  USAGE_SCENE: { FULL_VISUAL: 760, SPLIT: 650 },
  PRODUCT_DETAIL: { SINGLE_DETAIL: 650, SPLIT_DETAIL: 620 },
  USAGE_GUIDE: { TEXT_LED: 360, STEP_TEXT: 420 },
  BRAND_CONTENT: { FULL_VISUAL: 760, EDITORIAL_SPLIT: 640 },
  SPECS: { SIMPLE_FACTS: 340, TWO_COLUMN_FACTS: 400 },
};

const MODULE_DENSITY: Record<DetailPageModuleType, DetailPageCompositionDensity> = {
  HERO: "visual",
  BENEFITS: "standard",
  USAGE_SCENE: "visual",
  PRODUCT_DETAIL: "standard",
  USAGE_GUIDE: "compact",
  BRAND_CONTENT: "visual",
  SPECS: "compact",
};

const MODULE_SURFACE: Record<DetailPageModuleType, DetailPageCompositionSurface> = {
  HERO: "base",
  BENEFITS: "alternate",
  USAGE_SCENE: "base",
  PRODUCT_DETAIL: "base",
  USAGE_GUIDE: "alternate",
  BRAND_CONTENT: "editorial",
  SPECS: "muted",
};

const MODULE_MEDIA: Record<DetailPageModuleType, Exclude<DetailPageMediaTreatment, "source-framed">> = {
  HERO: "hero",
  BENEFITS: "supporting",
  USAGE_SCENE: "scene",
  PRODUCT_DETAIL: "detail",
  USAGE_GUIDE: "supporting",
  BRAND_CONTENT: "editorial",
  SPECS: "supporting",
};

export function getDetailPageCanonicalSourceAssetId(section: DetailPageSectionV2) {
  return section.evidence.find((item) => item.sourceType === "product-image" && item.field === "sourceAssetId")?.value || null;
}

export function isDetailPageCanonicalSourceSelected(section: DetailPageSectionV2) {
  const sourceAssetId = getDetailPageCanonicalSourceAssetId(section);
  return Boolean(sourceAssetId && section.selectedAssetId === sourceAssetId);
}

export function getDetailPageComposition(section: DetailPageSectionV2) {
  const density = section.moduleType === "BENEFITS" && section.layout === "TEXT_LED"
    ? "compact"
    : MODULE_DENSITY[section.moduleType];
  const canonicalSource = isDetailPageCanonicalSourceSelected(section);
  const mediaTreatment: DetailPageMediaTreatment = section.moduleType === "HERO" && canonicalSource
    ? "source-framed"
    : MODULE_MEDIA[section.moduleType];
  const height = SECTION_HEIGHTS[section.moduleType][section.layout];

  return {
    canonicalSource,
    density,
    height: height || 0,
    mediaTreatment,
    surface: MODULE_SURFACE[section.moduleType],
    textMaxWidth: DETAIL_PAGE_COMPOSITION_TOKENS.textMaxWidth[density],
  };
}
