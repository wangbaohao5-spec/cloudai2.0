import {
  DETAIL_PAGE_LAYOUT_VARIANTS,
  getDetailPageDefaultLayout,
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

const PAGE_STYLE_CLASSES: Record<DetailPageStylePreset, string> = {
  "brand-site": "is-brand-site",
  ecommerce: "is-ecommerce",
  minimal: "is-minimal",
  xiaohongshu: "is-xiaohongshu",
};

export function getDetailPagePreviewState(section: DetailPageSectionV2): DetailPagePreviewState {
  if (section.lifecycle === "GENERATING") return "generating";
  if (section.lifecycle === "FAILED") return "failed";
  if (section.readiness === "NEEDS_INPUT") return "needs-input";
  if (section.lifecycle === "COMPLETE") return "complete";
  return "planned";
}

export function getDetailPageStyleClass(preset: DetailPageStylePreset) {
  return PAGE_STYLE_CLASSES[preset];
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
      state: getDetailPagePreviewState(section),
    };

    if (section.hidden) hidden.push(item);
    else visible.push(item);
  }

  return { hidden, visible };
}
