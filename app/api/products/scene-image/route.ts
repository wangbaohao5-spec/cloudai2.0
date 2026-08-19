import { editImage } from "@/lib/ai/image-edit-provider";
import { buildProductGenerationBriefPrompt } from "@/lib/ai/product-generation-brief-prompt-builder";
import { buildProductSceneEditPrompt } from "@/lib/ai/product-scene-prompt-builder";
import { buildProductVisualFidelityPrompt } from "@/lib/ai/product-visual-fidelity-prompt-builder";
import { jsonError, settleTask } from "@/lib/api-errors";
import { createAsset, getAssetForUser } from "@/lib/assets";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, saveHistory } from "@/lib/history";
import { sanitizeProductGenerationBrief } from "@/lib/product-generation-brief";
import { sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import type { ProductVisualGenerationMode } from "@/lib/product-types";
import { getFileUrl, uploadFile } from "@/lib/storage";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductSceneImageRequestBody = {
  analysisHistoryId?: string;
  generationMode?: string;
  generationBrief?: unknown;
  outputSettings?: unknown;
  scene?: string;
  platform?: string;
  style?: string;
};

const PRODUCT_VISUAL_GENERATION_MODES = ["faithful", "creative"] as const;

function isProductVisualGenerationMode(value: string): value is ProductVisualGenerationMode {
  return PRODUCT_VISUAL_GENERATION_MODES.includes(value as ProductVisualGenerationMode);
}

function getProductTitle(analysis: { productNameSuggestions?: string[]; category?: string }, scene: string) {
  const productName = analysis.productNameSuggestions?.[0] || analysis.category || "商品";

  return `${productName} ${scene}场景图`;
}

function sanitizeAssetName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "product-scene";
}

function decodeBase64Image(b64Json: string) {
  const [, base64Payload] = b64Json.match(/^data:image\/\w+;base64,(.+)$/) || [];

  return Buffer.from(base64Payload || b64Json, "base64");
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
    const generationMode = typeof body.generationMode === "string" ? body.generationMode.trim() || "faithful" : "faithful";
    const generationBrief = sanitizeProductGenerationBrief(body.generationBrief);
    const outputSettings = sanitizeProductOutputSettings(body.outputSettings);

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    if (!scene) {
      return NextResponse.json({ error: "Scene is required." }, { status: 400 });
    }

    if (!isProductVisualGenerationMode(generationMode)) {
      return NextResponse.json({ error: "生成模式无效，请重新选择。" }, { status: 400 });
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

    if (!analysisRecord.assetId) {
      return NextResponse.json({ error: "Product analysis history does not include a source image asset." }, { status: 400 });
    }

    const sourceAsset = await getAssetForUser(user.id, analysisRecord.assetId);

    if (!sourceAsset) {
      return NextResponse.json({ error: "Product source image asset not found." }, { status: 404 });
    }

    if (sourceAsset.type !== "image" && sourceAsset.type !== "upload") {
      return NextResponse.json({ error: "Product source asset is not an editable image." }, { status: 400 });
    }

    const prompt = [
      buildProductSceneEditPrompt({
        analysis: analysisRecord.output,
        scene,
        platform,
        outputSettings,
        style,
      }),
      buildProductGenerationBriefPrompt(generationBrief),
      buildProductVisualFidelityPrompt({
        analysis: analysisRecord.output,
        generationMode,
      }),
    ].join("\n\n");
    const model = "gpt-image-2";

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "image",
      model: "gpt-image-2:product-scene",
    });

    const sourceImageUrl = await getFileUrl(sourceAsset.url);
    const editedImage = await editImage({
      imageUrl: sourceImageUrl,
      fileName: sourceAsset.name,
      prompt,
      model,
    });
    const title = getProductTitle(analysisRecord.output, scene);
    const imageBuffer = decodeBase64Image(editedImage.b64Json);
    const fileName = `${sanitizeAssetName(sourceAsset.name)}-${scene}-${Date.now()}.png`;
    const uploadedFile = await uploadFile({
      userId: user.id,
      type: "image",
      name: fileName,
      content: imageBuffer,
      contentType: "image/png",
    });
    const asset = await createAsset({
      userId: user.id,
      type: "image",
      name: fileName,
      url: uploadedFile.path,
    });
    const output = {
      imageUrl: uploadedFile.signedUrl,
      assetId: asset.id,
      storagePath: asset.url,
      prompt,
      provider: editedImage.provider,
      model: editedImage.model,
      modelId: "run-api-gpt-image-2-product-scene",
      limitation: "基于原商品图编辑生成，尽量保持商品主体一致",
    };
    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        assetId: asset.id,
        type: "image",
        title,
        input: {
          source: "product-scene-image",
          analysisHistoryId: analysisRecord.id,
          sourceAssetId: analysisRecord.assetId,
          scene,
          platform,
          style,
          generationMode,
          ...(generationBrief ? { generationBrief } : {}),
          ...(outputSettings ? { outputSettings } : {}),
          mustKeepDetails: analysisRecord.output.mustKeepDetails || [],
          avoidChanges: analysisRecord.output.avoidChanges || [],
        },
        output,
      }),
    );
    const warnings = [historyResult.error].filter((warning): warning is string => Boolean(warning));

    return NextResponse.json({
      prompt,
      type: "商品场景图",
      status: "success" as const,
      imageUrl: uploadedFile.signedUrl,
      assetId: asset.id,
      storagePath: asset.url,
      historyId: historyResult.data?.id,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Product scene image generation failed.");
  }
}
