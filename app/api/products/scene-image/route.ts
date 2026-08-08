import { generateImage } from "@/lib/ai/image-provider";
import { buildProductScenePrompt } from "@/lib/ai/product-scene-prompt-builder";
import { jsonError, settleTask } from "@/lib/api-errors";
import { saveRemoteAsset } from "@/lib/asset-ingest";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, saveHistory } from "@/lib/history";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductSceneImageRequestBody = {
  analysisHistoryId?: string;
  scene?: string;
  platform?: string;
  style?: string;
};

function getProductTitle(analysis: { productNameSuggestions?: string[]; category?: string }, scene: string) {
  const productName = analysis.productNameSuggestions?.[0] || analysis.category || "商品";

  return `${productName} ${scene}场景图`;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductSceneImageRequestBody;
    const analysisHistoryId = body.analysisHistoryId?.trim();
    const scene = body.scene?.trim();
    const platform = body.platform?.trim() || "taobao";
    const style = body.style?.trim() || "lifestyle";

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    if (!scene) {
      return NextResponse.json({ error: "Scene is required." }, { status: 400 });
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

    const prompt = buildProductScenePrompt({
      analysis: analysisRecord.output,
      scene,
      platform,
      style,
    });

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "image",
      model: "wanx2.1-t2i-turbo:product-scene",
    });

    const generatedImage = await generateImage(prompt);
    const title = getProductTitle(analysisRecord.output, scene);
    const storedAssetResult = await settleTask(
      saveRemoteAsset({
        userId: user.id,
        type: "image",
        sourceUrl: generatedImage.imageUrl,
        name: `${title}-${generatedImage.taskId || Date.now()}`,
      }),
    );
    const storedAsset = storedAssetResult.data;
    const imageUrl = storedAsset?.signedUrl || generatedImage.imageUrl;
    const output = {
      imageUrl,
      assetId: storedAsset?.asset.id,
      storagePath: storedAsset?.asset.url,
      storageError: storedAssetResult.error || undefined,
      taskId: generatedImage.taskId,
      prompt,
      provider: "dashscope-text2image",
      limitation: "基于商品分析结果生成，非原图参考生成",
    };
    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        assetId: storedAsset?.asset.id || null,
        type: "image",
        title,
        input: {
          source: "product-scene-image",
          analysisHistoryId: analysisRecord.id,
          sourceAssetId: analysisRecord.assetId,
          scene,
          platform,
          style,
        },
        output,
      }),
    );
    const warnings = [storedAssetResult.error, historyResult.error].filter((warning): warning is string => Boolean(warning));

    return NextResponse.json({
      prompt,
      type: "商品场景图",
      status: "success" as const,
      imageUrl,
      taskId: generatedImage.taskId,
      assetId: storedAsset?.asset.id,
      storagePath: storedAsset?.asset.url,
      historyId: historyResult.data?.id,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Product scene image generation failed.");
  }
}
