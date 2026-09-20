import {
  DETAIL_PAGE_LAYOUT_VARIANTS,
  getDetailPageDefaultLayout,
  getDetailPageSectionCompletion,
  type DetailPageAssetCandidate,
  type DetailPageLayout,
  type DetailPageModuleType,
  type DetailPageProjectV2,
  type DetailPageSectionV2,
  type DetailPageStylePreset,
} from "@/lib/detail-page-project";

export const DETAIL_PAGE_LOGICAL_WIDTH = 1200;

export type DetailPagePreviewState = "complete" | "failed" | "generating" | "needs-input" | "planned";

export type DetailPagePreviewSection = {
  asset: DetailPageAssetCandidate | null;
  layout: DetailPageLayout;
  missingPreview: boolean;
  section: DetailPageSectionV2;
  state: DetailPagePreviewState;
};

export type DetailPageStyleRole = {
  accent: string;
  background: string;
  className: string;
  muted: string;
  surface: string;
  surfaceAlt: string;
  text: string;
};

export const DETAIL_PAGE_STYLE_ROLES: Record<DetailPageStylePreset, DetailPageStyleRole> = {
  "brand-site": {
    className: "is-brand-site",
    background: "#f3f0e9",
    surface: "#faf8f2",
    surfaceAlt: "#e7e5de",
    text: "#1f2925",
    muted: "#64706b",
    accent: "#315e50",
  },
  ecommerce: {
    className: "is-ecommerce",
    background: "#f8f6f1",
    surface: "#fffdf8",
    surfaceAlt: "#f0eee8",
    text: "#1f2925",
    muted: "#64706b",
    accent: "#2f6552",
  },
  minimal: {
    className: "is-minimal",
    background: "#f6f6f3",
    surface: "#ffffff",
    surfaceAlt: "#eeeeea",
    text: "#1f2925",
    muted: "#64706b",
    accent: "#3f554c",
  },
  xiaohongshu: {
    className: "is-xiaohongshu",
    background: "#faf4ef",
    surface: "#fffaf6",
    surfaceAlt: "#f3e9e1",
    text: "#1f2925",
    muted: "#64706b",
    accent: "#8b574a",
  },
};

export function getDetailPagePreviewState(section: DetailPageSectionV2, selectedAssetAvailable = Boolean(section.selectedAssetId)): DetailPagePreviewState {
  if (section.lifecycle === "GENERATING") return "generating";
  if (section.lifecycle === "FAILED") return "failed";
  const completion = getDetailPageSectionCompletion(section, selectedAssetAvailable);
  if (completion.readiness === "NEEDS_INPUT") return "needs-input";
  if (completion.complete) return "complete";
  return "planned";
}

export function getDetailPageStyleClass(preset: DetailPageStylePreset) {
  return DETAIL_PAGE_STYLE_ROLES[preset].className;
}

export function getDetailPageStyleRole(preset: DetailPageStylePreset) {
  return DETAIL_PAGE_STYLE_ROLES[preset];
}

export function getDetailPageLayoutVariants(moduleType: DetailPageModuleType): readonly DetailPageLayout[] {
  return DETAIL_PAGE_LAYOUT_VARIANTS[moduleType];
}

export function getNextDetailPageLayout(moduleType: DetailPageModuleType, current: DetailPageLayout) {
  const variants = getDetailPageLayoutVariants(moduleType);
  const currentIndex = variants.indexOf(current);
  return variants[(currentIndex + 1) % variants.length] || getDetailPageDefaultLayout(moduleType);
}

export function buildDetailPagePreview(project: DetailPageProjectV2, candidates: DetailPageAssetCandidate[]) {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.assetId, candidate]));
  const visible: DetailPagePreviewSection[] = [];
  const hidden: DetailPagePreviewSection[] = [];

  for (const section of project.sections) {
    const asset = section.selectedAssetId ? candidateMap.get(section.selectedAssetId) || null : null;
    const item: DetailPagePreviewSection = {
      asset,
      layout: section.layout || getDetailPageDefaultLayout(section.moduleType),
      missingPreview: Boolean(section.selectedAssetId && !asset?.previewUrl),
      section,
      state: getDetailPagePreviewState(section, Boolean(asset)),
    };

    if (section.hidden) hidden.push(item);
    else visible.push(item);
  }

  return { hidden, visible };
}
