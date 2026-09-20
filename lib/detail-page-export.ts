import { ApiError } from "@/lib/api-errors";
import {
  DETAIL_PAGE_MAX_SECTIONS,
  getDetailPageSectionCompletion,
  getActiveDetailPageGeneration,
  isDetailPageLayoutSupported,
  type DetailPageModuleType,
  type DetailPageProjectV2,
  type DetailPageSectionV2,
} from "@/lib/detail-page-project";
import { DETAIL_PAGE_LOGICAL_WIDTH } from "@/lib/detail-page-preview";

export const DETAIL_PAGE_EXPORT_FORMAT = "jpeg" as const;
export const DETAIL_PAGE_EXPORT_QUALITY = 90;
export const DETAIL_PAGE_EXPORT_TIMEOUT_MS = 25_000;
export const DETAIL_PAGE_EXPORT_LIMITS = {
  maxSections: DETAIL_PAGE_MAX_SECTIONS,
  width: DETAIL_PAGE_LOGICAL_WIDTH,
  maxSectionHeight: 1_600,
  maxTotalHeight: 10_000,
  maxTotalPixels: 12_000_000,
  maxSourceBytes: 12 * 1024 * 1024,
  maxSourceDimension: 8_192,
  maxHeadlineLength: 200,
  maxBodyLength: 800,
} as const;

export type DetailPageExportMode = "full" | "section";
export type DetailPageExportReasonCode =
  | "COPY_REQUIRED"
  | "FAILED"
  | "GENERATING"
  | "INCOMPLETE_VISUAL"
  | "MALFORMED_COPY"
  | "MISSING_ASSET"
  | "NEEDS_INPUT"
  | "NO_VISIBLE_SECTIONS"
  | "PROJECT_BUSY"
  | "SECTION_HIDDEN"
  | "SECTION_NOT_FOUND"
  | "TOO_MANY_SECTIONS"
  | "UNSUPPORTED_LAYOUT";

export type DetailPageExportBlocker = {
  moduleType: DetailPageModuleType | null;
  reasonCode: DetailPageExportReasonCode;
  sectionId: string | null;
};

export class DetailPageExportReadinessError extends ApiError {
  blockingSections: DetailPageExportBlocker[];

  constructor(message: string, blockingSections: DetailPageExportBlocker[], status = 409) {
    super(message, status);
    this.name = "DetailPageExportReadinessError";
    this.blockingSections = blockingSections;
  }
}

function blocker(section: DetailPageSectionV2, reasonCode: DetailPageExportReasonCode): DetailPageExportBlocker {
  return { sectionId: section.id, moduleType: section.moduleType, reasonCode };
}

export function getDetailPageSectionExportBlockers(section: DetailPageSectionV2) {
  const blockers: DetailPageExportBlocker[] = [];
  const completion = getDetailPageSectionCompletion(section);

  if (!isDetailPageLayoutSupported(section.moduleType, section.layout)) blockers.push(blocker(section, "UNSUPPORTED_LAYOUT"));
  if (section.lifecycle === "GENERATING") blockers.push(blocker(section, "GENERATING"));
  if (section.lifecycle === "FAILED") blockers.push(blocker(section, "FAILED"));
  if (completion.readiness === "NEEDS_INPUT") blockers.push(blocker(section, "NEEDS_INPUT"));

  if (
    section.copy.headline.length > DETAIL_PAGE_EXPORT_LIMITS.maxHeadlineLength ||
    section.copy.body.length > DETAIL_PAGE_EXPORT_LIMITS.maxBodyLength
  ) {
    blockers.push(blocker(section, "MALFORMED_COPY"));
  }

  if (completion.requiresAsset) {
    if (section.lifecycle !== "COMPLETE") blockers.push(blocker(section, "INCOMPLETE_VISUAL"));
    if (!section.selectedAssetId) blockers.push(blocker(section, "MISSING_ASSET"));
  }

  if (completion.requiresCopy && !completion.hasValidCopy) {
    blockers.push(blocker(section, "COPY_REQUIRED"));
  }

  return blockers.filter((item, index, items) => items.findIndex((candidate) => candidate.reasonCode === item.reasonCode) === index);
}

export function getDetailPageExportSelection(project: DetailPageProjectV2, mode: DetailPageExportMode, sectionId?: string | null) {
  if (mode === "section") {
    const section = project.sections.find((item) => item.id === sectionId);

    if (!section) {
      throw new DetailPageExportReadinessError("该详情页模块不存在。", [{ sectionId: sectionId || null, moduleType: null, reasonCode: "SECTION_NOT_FOUND" }], 404);
    }

    if (section.hidden) {
      throw new DetailPageExportReadinessError("已隐藏模块不能导出切片。", [blocker(section, "SECTION_HIDDEN")]);
    }

    const blockers = getDetailPageSectionExportBlockers(section);
    if (blockers.length) throw new DetailPageExportReadinessError("当前模块尚未达到导出条件。", blockers);
    return [section];
  }

  const activeGeneration = getActiveDetailPageGeneration(project);
  if (activeGeneration) {
    throw new DetailPageExportReadinessError("当前详情页仍在制作，请完成后再导出。", [blocker(activeGeneration, "PROJECT_BUSY")]);
  }

  const sections = project.sections.filter((section) => !section.hidden).sort((left, right) => left.order - right.order);
  const blockers: DetailPageExportBlocker[] = [];

  if (!sections.length) blockers.push({ sectionId: null, moduleType: null, reasonCode: "NO_VISIBLE_SECTIONS" });
  if (sections.length > DETAIL_PAGE_EXPORT_LIMITS.maxSections) blockers.push({ sectionId: null, moduleType: null, reasonCode: "TOO_MANY_SECTIONS" });
  for (const section of sections) blockers.push(...getDetailPageSectionExportBlockers(section));

  if (blockers.length) {
    throw new DetailPageExportReadinessError(`还有 ${new Set(blockers.map((item) => item.sectionId).filter(Boolean)).size || 1} 个模块需要完成后才能导出完整详情页。`, blockers);
  }

  return sections;
}

export function sanitizeDetailPageExportSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .toLowerCase() || "product";
}

export function getDetailPageExportFilename(productTitle: string, mode: DetailPageExportMode, section?: DetailPageSectionV2) {
  if (mode === "section" && section) {
    const moduleSlug = section.moduleType.toLowerCase().replaceAll("_", "-");
    return `${String(section.order).padStart(2, "0")}-${moduleSlug}.jpg`;
  }

  return `vahoro-detail-page-${sanitizeDetailPageExportSlug(productTitle)}.jpg`;
}

export async function withDetailPageExportTimeout<T>(task: (signal: AbortSignal) => Promise<T>, externalSignal?: AbortSignal) {
  if (externalSignal?.aborted) throw new ApiError("导出请求已取消。", 499);

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new ApiError("详情页导出超时，请稍后重试。", 504));
      controller.abort();
    }, DETAIL_PAGE_EXPORT_TIMEOUT_MS);
    if (externalSignal) {
      abortHandler = () => {
        reject(new ApiError("导出请求已取消。", 499));
        controller.abort();
      };
      externalSignal.addEventListener("abort", abortHandler, { once: true });
    }
  });

  try {
    return await Promise.race([task(controller.signal), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal && abortHandler) externalSignal.removeEventListener("abort", abortHandler);
  }
}
