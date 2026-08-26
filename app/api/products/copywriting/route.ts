import { generateCopywriting } from "@/lib/ai/copywriting";
import { scanProductContentRisk } from "@/lib/ai/product-content-risk-scanner";
import { getTextProviderModelId } from "@/lib/ai/text-router";
import { ApiError, jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, saveHistory } from "@/lib/history";
import { buildCopywritingDataFromAnalysis, isProductImageAnalysis, type ProductCopywritingOptions } from "@/lib/product-copywriting";
import { sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import { classifyUsageFailure, finalizeUsage, getUsageRequestId, refundUsage, reserveUsage, type UsageFailureCode } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductCopywritingRequestBody = ProductCopywritingOptions & {
  analysisHistoryId?: string;
  outputSettings?: unknown;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductCopywritingRequestBody;
    const analysisHistoryId = body.analysisHistoryId?.trim();
    const outputSettings = sanitizeProductOutputSettings(body.outputSettings);

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    const analysisRecord = await getHistoryRecordForUser(user.id, analysisHistoryId);

    if (!analysisRecord) {
      return NextResponse.json({ error: "Product analysis history not found." }, { status: 404 });
    }

    if (analysisRecord.type !== "product-analysis") {
      return NextResponse.json({ error: "History record is not a product analysis." }, { status: 400 });
    }

    if (!isProductImageAnalysis(analysisRecord.output)) {
      return NextResponse.json({ error: "Product analysis result is invalid." }, { status: 400 });
    }

    const copywritingData = buildCopywritingDataFromAnalysis(analysisRecord.output, {
      platform: outputSettings?.targetPlatform || body.platform,
      tone: body.tone,
      goal: body.goal,
      outputType: body.outputType,
      outputTypes: body.outputTypes,
      generationMode: body.generationMode,
      outputSettings,
    });

    const requestId = getUsageRequestId(request);
    const usageReservation = await reserveUsage({
      userId: user.id,
      type: "copywriting",
      model: getTextProviderModelId("product-copywriting", outputSettings),
      requestId,
      metadata: {
        route: "/api/products/copywriting",
        analysisHistoryId: analysisRecord.id,
      },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    const persistedResult = await (async () => {
      let failureCode: UsageFailureCode = "PROVIDER_ERROR";

      try {
        const result = await generateCopywriting(copywritingData, "product-copywriting");
        const riskScan = scanProductContentRisk(JSON.stringify(result));

        console.info("[product-risk-scan]", {
          source: "product-copywriting",
          level: riskScan.level,
          matches: riskScan.matches,
        });

        const output = { ...result, riskScan };
        failureCode = "HISTORY_PERSIST_ERROR";
        const history = await saveHistory({
          userId: user.id,
          assetId: analysisRecord.assetId || null,
          type: "copywriting",
          title: copywritingData.productName || analysisRecord.title || "商品文案",
          input: {
            source: "product-analysis",
            analysisHistoryId: analysisRecord.id,
            assetId: analysisRecord.assetId,
            ...(outputSettings ? { outputSettings } : {}),
            formData: copywritingData,
            analysis: analysisRecord.output,
          },
          output,
        });

        return { history, output };
      } catch (error) {
        try {
          await refundUsage({
            usageRecordId: usageReservation.record.id,
            userId: user.id,
            failureCode: classifyUsageFailure(error, failureCode),
          });
        } catch (refundError) {
          console.error("[usage] product copywriting refund failed", {
            usageRecordId: usageReservation.record.id,
            error: refundError instanceof Error ? refundError.message : String(refundError),
          });
        }

        throw error;
      }
    })();

    await finalizeUsage({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      metadata: {
        route: "/api/products/copywriting",
        analysisHistoryId: analysisRecord.id,
        historyId: persistedResult.history.id,
      },
    });

    return NextResponse.json({
      ...persistedResult.output,
      historyId: persistedResult.history.id,
    });
  } catch (error) {
    return jsonError(error, "Product analysis copywriting generation failed.");
  }
}
