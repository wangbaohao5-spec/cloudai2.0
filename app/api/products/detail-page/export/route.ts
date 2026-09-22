import { ApiError, jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { getDetailPageAssetStoragePathsForExport } from "@/lib/detail-page-assets";
import {
  DETAIL_PAGE_EXPORT_LIMITS,
  DetailPageExportReadinessError,
  getDetailPageExportFilename,
  getDetailPageExportSelection,
  type DetailPageExportMode,
  withDetailPageExportTimeout,
} from "@/lib/detail-page-export";
import {
  composeDetailPageExport,
  encodeDetailPageSection,
  getDetailPageExportContentType,
  getDetailPageSectionRenderPlan,
  renderDetailPageSection,
  type RenderedDetailPageSection,
  validateDetailPageCompositeBudget,
} from "@/lib/detail-page-export-renderer";
import { canBindExistingAssetToModule, type DetailPageSectionV2 } from "@/lib/detail-page-project";
import { getDetailPageProjectForUser } from "@/lib/detail-page-projects";
import { getHistoryRecordForUser } from "@/lib/history";
import { downloadFile } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;
const STORAGE_DOWNLOAD_CONCURRENCY = 3;

type ExportStage =
  | "PROJECT_LOAD"
  | "READINESS_CHECK"
  | "ASSET_RESOLUTION"
  | "STORAGE_DOWNLOAD"
  | "ASSET_METADATA"
  | "IMAGE_DECODE"
  | "SECTION_LAYOUT"
  | "TEXT_SVG_BUILD"
  | "SECTION_RENDER"
  | "SECTION_ENCODE"
  | "FULL_COMPOSITE"
  | "FULL_JPEG_ENCODE"
  | "HTTP_RESPONSE_BUILD";

type SectionExportTiming = {
  asset: boolean;
  bytes: number;
  height: number;
  layout: string;
  moduleType: string;
  renderMs: number;
  width: number;
};

function createExportTiming() {
  const startedAt = performance.now();
  const stages = new Map<ExportStage, number>();
  const sections: SectionExportTiming[] = [];

  return {
    add(stage: ExportStage, durationMs: number) {
      stages.set(stage, (stages.get(stage) || 0) + durationMs);
    },
    async measure<T>(stage: ExportStage, task: () => Promise<T>) {
      const stageStartedAt = performance.now();
      try {
        return await task();
      } finally {
        this.add(stage, performance.now() - stageStartedAt);
      }
    },
    measureSync<T>(stage: ExportStage, task: () => T) {
      const stageStartedAt = performance.now();
      try {
        return task();
      } finally {
        this.add(stage, performance.now() - stageStartedAt);
      }
    },
    sections,
    snapshot() {
      return {
        stages: Object.fromEntries(Array.from(stages, ([stage, duration]) => [stage, Math.round(duration)])),
        sections,
        totalMs: Math.round(performance.now() - startedAt),
      };
    },
    serverTiming() {
      return Array.from(stages, ([stage, duration]) => `${stage.toLowerCase()};dur=${duration.toFixed(1)}`).join(", ");
    },
  };
}

async function mapWithConcurrency<T, R>(items: readonly T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

type ExportRequestBody = {
  analysisHistoryId?: string;
  expectedRevision?: number;
  mode?: string;
  projectId?: string;
  sectionId?: string;
};

function parseMode(value: unknown): DetailPageExportMode | null {
  return value === "full" || value === "section" ? value : null;
}

async function renderExport({
  analysisHistoryId,
  mode,
  sections,
  timing,
  userId,
  pageStyle,
  signal,
}: {
  analysisHistoryId: string;
  mode: DetailPageExportMode;
  pageStyle: Parameters<typeof renderDetailPageSection>[0]["pageStyle"];
  sections: DetailPageSectionV2[];
  signal: AbortSignal;
  timing: ReturnType<typeof createExportTiming>;
  userId: string;
}) {
  validateDetailPageCompositeBudget(sections.map((section) => ({ height: getDetailPageSectionRenderPlan(section).height })));
  const assetIds = Array.from(new Set(sections
    .filter((section) => canBindExistingAssetToModule(section.moduleType))
    .map((section) => section.selectedAssetId)
    .filter((assetId): assetId is string => Boolean(assetId))));
  const storagePaths = await timing.measure("ASSET_RESOLUTION", () => getDetailPageAssetStoragePathsForExport(userId, analysisHistoryId, assetIds));
  const missingAsset = sections.find((section) => section.selectedAssetId && !storagePaths.has(section.selectedAssetId));
  if (missingAsset) {
    throw new DetailPageExportReadinessError("模块素材不可用，请重新选择后再导出。", [
      { sectionId: missingAsset.id, moduleType: missingAsset.moduleType, reasonCode: "MISSING_ASSET" },
    ]);
  }

  const downloaded = await timing.measure("STORAGE_DOWNLOAD", async () => {
    try {
      return await mapWithConcurrency(assetIds, STORAGE_DOWNLOAD_CONCURRENCY, async (assetId) => {
        if (signal.aborted) throw new ApiError("导出请求已取消。", 499);
        const storagePath = storagePaths.get(assetId);
        if (!storagePath) throw new Error("Missing scoped Storage path.");
        return [assetId, await downloadFile(storagePath, DETAIL_PAGE_EXPORT_LIMITS.maxSourceBytes)] as const;
      });
    } catch (error) {
      console.warn("[detail-page-export] storage read failed", {
        errorName: error instanceof Error ? error.name : typeof error,
      });
      throw new DetailPageExportReadinessError("模块素材暂时无法读取，请重新选择或稍后重试。", [
        { sectionId: null, moduleType: null, reasonCode: "MISSING_ASSET" },
      ]);
    }
  });
  const assetBuffers = new Map(downloaded);
  const rendered: RenderedDetailPageSection[] = [];

  for (const section of sections) {
    if (signal.aborted) throw new ApiError("导出请求已取消。", 499);
    const sectionStartedAt = performance.now();
    const assetBuffer = section.selectedAssetId ? assetBuffers.get(section.selectedAssetId) || null : null;
    const result = await renderDetailPageSection({
      assetBuffer,
      pageStyle,
      section,
      onTiming(sectionTiming) {
        timing.add("ASSET_METADATA", sectionTiming.assetMetadataMs);
        timing.add("IMAGE_DECODE", sectionTiming.imageDecodeMs);
        timing.add("SECTION_LAYOUT", sectionTiming.sectionLayoutMs);
        timing.add("TEXT_SVG_BUILD", sectionTiming.textSvgBuildMs);
        timing.add("SECTION_RENDER", sectionTiming.sectionRenderMs);
      },
    });
    rendered.push(result);
    timing.sections.push({
      asset: Boolean(assetBuffer),
      bytes: result.buffer.byteLength,
      height: result.height,
      layout: section.layout,
      moduleType: section.moduleType,
      renderMs: Math.round(performance.now() - sectionStartedAt),
      width: result.width,
    });
  }

  if (mode === "section") {
    return timing.measure("SECTION_ENCODE", () => encodeDetailPageSection(rendered[0]));
  }

  return composeDetailPageExport(rendered, pageStyle, (compositeTiming) => {
    timing.add("FULL_COMPOSITE", compositeTiming.fullCompositeMs);
    timing.add("FULL_JPEG_ENCODE", compositeTiming.fullJpegEncodeMs);
  });
}

export async function POST(request: Request) {
  const timing = createExportTiming();
  let mode: DetailPageExportMode | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as ExportRequestBody | null;
    const analysisHistoryId = body?.analysisHistoryId?.trim();
    const projectId = body?.projectId?.trim();
    const expectedRevision = Number(body?.expectedRevision);
    mode = parseMode(body?.mode);
    const sectionId = body?.sectionId?.trim() || null;

    if (!analysisHistoryId || !projectId || !mode || !Number.isInteger(expectedRevision) || expectedRevision < 1 || (mode === "section" && !sectionId)) {
      throw new ApiError("详情页导出请求无效。", 400);
    }

    const [project, analysisRecord] = await timing.measure("PROJECT_LOAD", () => Promise.all([
      getDetailPageProjectForUser(user.id, analysisHistoryId),
      getHistoryRecordForUser(user.id, analysisHistoryId),
    ]));

    if (!project || project.projectId !== projectId || !analysisRecord || analysisRecord.type !== "product-analysis") {
      throw new ApiError("详情页项目不存在。", 404);
    }

    if (project.revision !== expectedRevision) {
      throw new ApiError("详情页已在其他页面更新，请刷新预览后再导出。", 409);
    }

    const sections = timing.measureSync("READINESS_CHECK", () => getDetailPageExportSelection(project, mode!, sectionId));
    const output = await withDetailPageExportTimeout((signal) => renderExport({
      analysisHistoryId,
      mode: mode!,
      pageStyle: project.pageStyle.preset,
      sections,
      signal,
      timing,
      userId: user.id,
    }), request.signal);
    const filename = getDetailPageExportFilename(analysisRecord.title, mode, sections[0]);
    const response = timing.measureSync("HTTP_RESPONSE_BUILD", () => new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(output.byteLength),
        "Content-Type": getDetailPageExportContentType(),
        "X-Content-Type-Options": "nosniff",
      },
    }));
    response.headers.set("Server-Timing", timing.serverTiming());
    console.info("[detail-page-export] completed", { mode, outcome: "succeeded", ...timing.snapshot() });
    return response;
  } catch (error) {
    console.info("[detail-page-export] completed", {
      errorName: error instanceof Error ? error.name : typeof error,
      mode,
      outcome: "failed",
      ...timing.snapshot(),
    });
    if (error instanceof DetailPageExportReadinessError) {
      const response = NextResponse.json(
        { error: error.message, blockingSections: error.blockingSections },
        { status: error.status, headers: { "Cache-Control": "private, no-store" } },
      );
      response.headers.set("Server-Timing", timing.serverTiming());
      return response;
    }

    const response = jsonError(error, "详情页暂时无法导出，请稍后重试。");
    response.headers.set("Server-Timing", timing.serverTiming());
    return response;
  }
}
