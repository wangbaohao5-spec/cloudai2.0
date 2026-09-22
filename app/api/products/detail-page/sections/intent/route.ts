import { ApiError, jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { logDetailPageGenerationTrigger } from "@/lib/detail-page-generation-diagnostics";
import {
  createDetailPageSectionGenerationIntent,
} from "@/lib/detail-page-section-generation";
import type {
  DetailPageGenerationEventType,
  DetailPageGenerationPagePhase,
  DetailPageNavigationType,
} from "@/lib/detail-page-project";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type IntentBody = {
  analysisHistoryId?: string;
  eventType?: unknown;
  expectedRevision?: number;
  navigationType?: unknown;
  pagePhase?: unknown;
  sectionId?: string;
};

function cleanId(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

function parseEventType(value: unknown): DetailPageGenerationEventType | null {
  return value === "generate-click" || value === "retry-click" || value === "regenerate-click" ? value : null;
}

function parsePagePhase(value: unknown): DetailPageGenerationPagePhase | null {
  return value === "build" || value === "preview" ? value : null;
}

function parseNavigationType(value: unknown): DetailPageNavigationType {
  return value === "navigate" || value === "reload" || value === "back_forward" || value === "prerender" ? value : "unknown";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as IntentBody;
    const analysisHistoryId = cleanId(body.analysisHistoryId);
    const sectionId = cleanId(body.sectionId);
    const expectedRevision = Number(body.expectedRevision);
    const eventType = parseEventType(body.eventType);
    const pagePhase = parsePagePhase(body.pagePhase);
    const navigationType = parseNavigationType(body.navigationType);

    if (!analysisHistoryId || !sectionId || !eventType || !pagePhase) {
      throw new ApiError("制作请求信息无效，请重新点击生成。", 400);
    }
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
      throw new ApiError("详情页策划版本无效，请刷新后重试。", 400);
    }

    const result = await createDetailPageSectionGenerationIntent({
      analysisHistoryId,
      eventType,
      expectedRevision,
      navigationType,
      pagePhase,
      sectionId,
      userId: user.id,
    });
    logDetailPageGenerationTrigger({
      event: "intent-created",
      eventType,
      intentId: result.intent.id,
      moduleType: result.section.moduleType,
      navigationType,
      pagePhase,
      projectRevision: result.project.revision,
      sectionId,
    });

    return NextResponse.json(
      { intentId: result.intent.id, project: result.project },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error, "制作请求创建失败，请稍后重试。");
  }
}
