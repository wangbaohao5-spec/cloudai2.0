import { analyzeProductImageAsset } from "@/lib/ai/product-analysis";
import { getAssetForUser } from "@/lib/assets";
import { jsonError, settleTask } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { saveHistory } from "@/lib/history";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { getFileUrl } from "@/lib/storage";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductAnalyzeRequestBody = {
  assetId?: string;
};

function getAnalysisTitle(analysis: ProductAnalysisResponse["analysis"]) {
  return analysis.productNameSuggestions[0] || analysis.category || "商品图片分析";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductAnalyzeRequestBody;
    const assetId = body.assetId?.trim();

    if (!assetId) {
      return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
    }

    const asset = await getAssetForUser(user.id, assetId);

    if (!asset || asset.type !== "upload") {
      return NextResponse.json({ error: "Product image asset not found." }, { status: 404 });
    }

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "product-analysis",
      model: "dashscope-vision",
    });

    const imageUrl = await getFileUrl(asset.url, 30 * 60);
    const analysis = await analyzeProductImageAsset(imageUrl);
    const title = getAnalysisTitle(analysis);
    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        assetId: asset.id,
        type: "product-analysis",
        title,
        input: {
          assetId: asset.id,
          assetName: asset.name,
        },
        output: analysis,
      }),
    );
    const warnings = [historyResult.error].filter((warning): warning is string => Boolean(warning));

    return NextResponse.json({
      assetId: asset.id,
      historyId: historyResult.data?.id,
      title,
      analysis,
      warnings: warnings.length ? warnings : undefined,
    } satisfies ProductAnalysisResponse);
  } catch (error) {
    return jsonError(error, "Product image analysis failed.");
  }
}
