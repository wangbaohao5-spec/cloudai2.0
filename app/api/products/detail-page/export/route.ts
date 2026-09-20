import { ApiError, jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { getDetailPageAssetCandidateForBinding } from "@/lib/detail-page-assets";
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
  getDetailPageExportContentType,
  getDetailPageSectionRenderPlan,
  renderDetailPageSection,
  validateDetailPageCompositeBudget,
} from "@/lib/detail-page-export-renderer";
import { canBindExistingAssetToModule, type DetailPageSectionV2 } from "@/lib/detail-page-project";
import { getDetailPageProjectForUser } from "@/lib/detail-page-projects";
import { getHistoryRecordForUser } from "@/lib/history";
import { downloadFile } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

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

async function resolveSectionAsset(userId: string, analysisHistoryId: string, section: DetailPageSectionV2) {
  if (!canBindExistingAssetToModule(section.moduleType)) return null;
  if (!section.selectedAssetId) {
    throw new DetailPageExportReadinessError("模块素材不可用，请重新选择后再导出。", [
      { sectionId: section.id, moduleType: section.moduleType, reasonCode: "MISSING_ASSET" },
    ]);
  }

  const candidate = await getDetailPageAssetCandidateForBinding(userId, analysisHistoryId, section.selectedAssetId);
  if (!candidate) {
    throw new DetailPageExportReadinessError("模块素材不可用，请重新选择后再导出。", [
      { sectionId: section.id, moduleType: section.moduleType, reasonCode: "MISSING_ASSET" },
    ]);
  }

  const asset = await db.asset.findFirst({
    where: { id: section.selectedAssetId, userId, type: { in: ["image", "upload"] } },
    select: { url: true },
  });

  if (!asset) {
    throw new DetailPageExportReadinessError("模块素材不可用，请重新选择后再导出。", [
      { sectionId: section.id, moduleType: section.moduleType, reasonCode: "MISSING_ASSET" },
    ]);
  }

  try {
    return await downloadFile(asset.url, DETAIL_PAGE_EXPORT_LIMITS.maxSourceBytes);
  } catch (error) {
    console.warn("[detail-page-export] storage read failed", {
      errorName: error instanceof Error ? error.name : typeof error,
      sectionId: section.id,
    });
    throw new DetailPageExportReadinessError("模块素材暂时无法读取，请重新选择或稍后重试。", [
      { sectionId: section.id, moduleType: section.moduleType, reasonCode: "MISSING_ASSET" },
    ]);
  }
}

async function renderExport({
  analysisHistoryId,
  mode,
  sections,
  userId,
  pageStyle,
  signal,
}: {
  analysisHistoryId: string;
  mode: DetailPageExportMode;
  pageStyle: Parameters<typeof renderDetailPageSection>[0]["pageStyle"];
  sections: DetailPageSectionV2[];
  signal: AbortSignal;
  userId: string;
}) {
  validateDetailPageCompositeBudget(sections.map((section) => ({ height: getDetailPageSectionRenderPlan(section).height })));
  const rendered = [];

  for (const section of sections) {
    if (signal.aborted) throw new ApiError("导出请求已取消。", 499);
    const assetBuffer = await resolveSectionAsset(userId, analysisHistoryId, section);
    if (signal.aborted) throw new ApiError("导出请求已取消。", 499);
    rendered.push(await renderDetailPageSection({ assetBuffer, pageStyle, section }));
  }

  return mode === "section" ? rendered[0].buffer : composeDetailPageExport(rendered, pageStyle);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as ExportRequestBody | null;
    const analysisHistoryId = body?.analysisHistoryId?.trim();
    const projectId = body?.projectId?.trim();
    const expectedRevision = Number(body?.expectedRevision);
    const mode = parseMode(body?.mode);
    const sectionId = body?.sectionId?.trim() || null;

    if (!analysisHistoryId || !projectId || !mode || !Number.isInteger(expectedRevision) || expectedRevision < 1 || (mode === "section" && !sectionId)) {
      throw new ApiError("详情页导出请求无效。", 400);
    }

    const [project, analysisRecord] = await Promise.all([
      getDetailPageProjectForUser(user.id, analysisHistoryId),
      getHistoryRecordForUser(user.id, analysisHistoryId),
    ]);

    if (!project || project.projectId !== projectId || !analysisRecord || analysisRecord.type !== "product-analysis") {
      throw new ApiError("详情页项目不存在。", 404);
    }

    if (project.revision !== expectedRevision) {
      throw new ApiError("详情页已在其他页面更新，请刷新预览后再导出。", 409);
    }

    const sections = getDetailPageExportSelection(project, mode, sectionId);
    const output = await withDetailPageExportTimeout((signal) => renderExport({
      analysisHistoryId,
      mode,
      pageStyle: project.pageStyle.preset,
      sections,
      signal,
      userId: user.id,
    }), request.signal);
    const filename = getDetailPageExportFilename(analysisRecord.title, mode, sections[0]);

    return new Response(new Uint8Array(output), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(output.byteLength),
        "Content-Type": getDetailPageExportContentType(),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DetailPageExportReadinessError) {
      return NextResponse.json(
        { error: error.message, blockingSections: error.blockingSections },
        { status: error.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return jsonError(error, "详情页暂时无法导出，请稍后重试。");
  }
}
