import { generateCopywriting } from "@/lib/ai/copywriting";
import { scanProductContentRisk } from "@/lib/ai/product-content-risk-scanner";
import { getTextProviderModelId } from "@/lib/ai/text-router";
import { jsonError, settleTask } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, saveHistory } from "@/lib/history";
import { buildCopywritingDataFromAnalysis, isProductImageAnalysis, type ProductCopywritingOptions } from "@/lib/product-copywriting";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductCopywritingRequestBody = ProductCopywritingOptions & {
  analysisHistoryId?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductCopywritingRequestBody;
    const analysisHistoryId = body.analysisHistoryId?.trim();

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
      platform: body.platform,
      tone: body.tone,
      goal: body.goal,
      outputType: body.outputType,
      outputTypes: body.outputTypes,
      generationMode: body.generationMode,
    });

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "copywriting",
      model: getTextProviderModelId("product-copywriting"),
    });

    const result = await generateCopywriting(copywritingData, "product-copywriting");
    const riskScan = scanProductContentRisk(JSON.stringify(result));

    console.info("[product-risk-scan]", {
      source: "product-copywriting",
      level: riskScan.level,
      matches: riskScan.matches,
    });

    const output = {
      ...result,
      riskScan,
    };

    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        assetId: analysisRecord.assetId || null,
        type: "copywriting",
        title: copywritingData.productName || analysisRecord.title || "商品文案",
        input: {
          source: "product-analysis",
          analysisHistoryId: analysisRecord.id,
          assetId: analysisRecord.assetId,
          formData: copywritingData,
          analysis: analysisRecord.output,
        },
        output,
      }),
    );
    const warnings = [historyResult.error].filter((warning): warning is string => Boolean(warning));

    return NextResponse.json({
      ...output,
      historyId: historyResult.data?.id,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Product analysis copywriting generation failed.");
  }
}
