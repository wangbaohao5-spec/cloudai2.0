import { buildProductDetailPageV2PlanPrompt, type ProductDetailPageStyle } from "@/lib/ai/product-detail-page-plan-prompt-builder";
import { generateText, getTextProviderModelId } from "@/lib/ai/text-router";
import { ApiError, jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import {
  createDetailPageProject,
  createFallbackDetailPageProject,
  DetailPageProjectError,
  isDetailPageStylePreset,
  parseDetailPageProjectOperation,
  type DetailPagePlanCandidate,
} from "@/lib/detail-page-project";
import {
  getDetailPageProjectForUser,
  getDetailPageProjectRecordId,
  persistDetailPageProject,
  updateDetailPageProject,
} from "@/lib/detail-page-projects";
import { getHistoryRecordForUser, getProductRelatedHistory } from "@/lib/history";
import { sanitizeProductGenerationBrief } from "@/lib/product-generation-brief";
import { sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import { finalizeUsage, getUsageRequestId, reserveUsage } from "@/lib/usage";
import { runReservedUsageTask } from "@/lib/usage-route";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductDetailPagePlanRequestBody = {
  analysisHistoryId?: string;
  generationBrief?: unknown;
  outputSettings?: unknown;
  sectionCount?: number;
  style?: string;
};

type ProductDetailPagePatchRequestBody = {
  analysisHistoryId?: string;
  expectedRevision?: number;
  operation?: unknown;
};

function parseJsonResponse(response: string) {
  const trimmed = response.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(withoutFence) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Detail page plan response is invalid.");
  }

  return parsed as DetailPagePlanCandidate;
}

function normalizeSectionCount(value: unknown) {
  const sectionCount = Number(value ?? 7);

  if (!Number.isInteger(sectionCount) || sectionCount < 5 || sectionCount > 8) {
    throw new ApiError("详情页策划需包含 5 到 8 个模块。", 400);
  }

  return sectionCount;
}

async function getProductAnalysis(userId: string, analysisHistoryId: string) {
  const analysisRecord = await getHistoryRecordForUser(userId, analysisHistoryId);

  if (!analysisRecord) {
    throw new ApiError("Product analysis history not found.", 404);
  }

  if (analysisRecord.type !== "product-analysis") {
    throw new ApiError("History record is not a product analysis.", 400);
  }

  if (!isProductImageAnalysis(analysisRecord.output)) {
    throw new ApiError("Product analysis result is invalid.", 400);
  }

  return {
    ...analysisRecord,
    output: analysisRecord.output,
  };
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analysisHistoryId = new URL(request.url).searchParams.get("analysisHistoryId")?.trim();

    if (!analysisHistoryId) {
      throw new ApiError("Analysis history id is required.", 400);
    }

    await getProductAnalysis(user.id, analysisHistoryId);
    const project = await getDetailPageProjectForUser(user.id, analysisHistoryId);

    return NextResponse.json(
      { project },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(error, "Detail page project could not be loaded.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductDetailPagePlanRequestBody;
    const analysisHistoryId = body.analysisHistoryId?.trim();

    if (!analysisHistoryId) {
      throw new ApiError("Analysis history id is required.", 400);
    }

    const analysisRecord = await getProductAnalysis(user.id, analysisHistoryId);
    const existingProject = await getDetailPageProjectForUser(user.id, analysisHistoryId);

    if (existingProject) {
      return NextResponse.json({ project: existingProject, source: "recovered" as const });
    }

    const sectionCount = normalizeSectionCount(body.sectionCount);
    const style: ProductDetailPageStyle = isDetailPageStylePreset(body.style) ? body.style : "ecommerce";
    const generationBrief = sanitizeProductGenerationBrief(body.generationBrief);
    const outputSettings = sanitizeProductOutputSettings(body.outputSettings);
    const relatedHistory = await getProductRelatedHistory({
      userId: user.id,
      analysisHistoryId: analysisRecord.id,
      sourceAssetId: analysisRecord.assetId,
    });
    const copywritingRecords = relatedHistory.filter((record) => record.type === "copywriting");
    const projectId = getDetailPageProjectRecordId(analysisRecord.id);
    const prompt = buildProductDetailPageV2PlanPrompt({
      analysis: analysisRecord.output,
      copywritingRecords,
      generationBrief,
      outputSettings,
      productTitle: analysisRecord.title,
      sectionCount,
      style,
    });

    const usageReservation = await reserveUsage({
      userId: user.id,
      type: "copywriting",
      model: getTextProviderModelId("detail-page-plan", outputSettings),
      requestId: getUsageRequestId(request),
      metadata: { route: "/api/products/detail-page/plan", analysisHistoryId, sectionCount },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    try {
      const project = await runReservedUsageTask({
        usageRecordId: usageReservation.record.id,
        userId: user.id,
        logLabel: "detail page V2 planning",
        task: async ({ setFailureCode }) => {
          const response = await generateText({
            messages: [
              {
                role: "system",
                content: "你是 Vahoro 的电商详情页策划助手，只输出严格 JSON，不输出 Markdown 或解释。",
              },
              { role: "user", content: prompt },
            ],
            jsonMode: true,
            outputSettings,
            task: "detail-page-plan",
            temperature: 0.45,
          });
          setFailureCode("PARSE_ERROR");
          const candidate = parseJsonResponse(response);
          const normalizedProject = createDetailPageProject({
            analysisHistoryId,
            candidate,
            preset: style,
            projectId,
            sectionCount,
            sourceAssetId: analysisRecord.assetId,
            userId: user.id,
          });
          setFailureCode("HISTORY_PERSIST_ERROR");
          return persistDetailPageProject(normalizedProject, analysisRecord.title);
        },
      });

      try {
        await finalizeUsage({
          usageRecordId: usageReservation.record.id,
          userId: user.id,
          metadata: { route: "/api/products/detail-page/plan", analysisHistoryId, sectionCount, projectId: project.projectId },
        });
      } catch (error) {
        console.error("[usage] detail page V2 planning finalize failed", {
          usageRecordId: usageReservation.record.id,
          route: "/api/products/detail-page/plan",
          errorName: error instanceof Error ? error.name : typeof error,
        });
      }

      return NextResponse.json({ project, source: "ai" as const });
    } catch (error) {
      console.warn("[detail-page-project] AI planning unavailable, using fallback", {
        analysisHistoryId,
        errorName: error instanceof Error ? error.name : typeof error,
      });
      const fallbackProject = createFallbackDetailPageProject({
        analysisHistoryId,
        preset: style,
        projectId,
        sectionCount,
        sourceAssetId: analysisRecord.assetId,
        userId: user.id,
      });
      const project = await persistDetailPageProject(fallbackProject, analysisRecord.title);
      return NextResponse.json({ project, source: "fallback" as const });
    }
  } catch (error) {
    return jsonError(error, "Detail page project could not be created.");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductDetailPagePatchRequestBody;
    const analysisHistoryId = body.analysisHistoryId?.trim();
    const expectedRevision = Number(body.expectedRevision);
    const operation = parseDetailPageProjectOperation(body.operation);

    if (!analysisHistoryId) {
      throw new ApiError("Analysis history id is required.", 400);
    }

    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
      throw new ApiError("Detail page project revision is invalid.", 400);
    }

    if (!operation) {
      throw new ApiError("Detail page project update is invalid.", 400);
    }

    await getProductAnalysis(user.id, analysisHistoryId);

    try {
      const project = await updateDetailPageProject({ analysisHistoryId, expectedRevision, operation, userId: user.id });
      return NextResponse.json({ project });
    } catch (error) {
      if (error instanceof DetailPageProjectError) {
        throw new ApiError(error.message, error.status);
      }
      throw error;
    }
  } catch (error) {
    return jsonError(error, "Detail page project could not be updated.");
  }
}
