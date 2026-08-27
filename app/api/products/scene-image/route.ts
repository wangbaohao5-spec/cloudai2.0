import { editImage } from "@/lib/ai/image-edit-provider";
import { resolveImageEditRoute } from "@/lib/ai/image-edit-router";
import { buildProductGenerationBriefPrompt } from "@/lib/ai/product-generation-brief-prompt-builder";
import { buildProductSceneEditPrompt } from "@/lib/ai/product-scene-prompt-builder";
import { buildProductVisualFidelityPrompt } from "@/lib/ai/product-visual-fidelity-prompt-builder";
import { ApiError, jsonError } from "@/lib/api-errors";
import { createAsset, getAssetForUser } from "@/lib/assets";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, saveHistory } from "@/lib/history";
import { sanitizeProductGenerationBrief } from "@/lib/product-generation-brief";
import { sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import type { ProductVisualGenerationMode } from "@/lib/product-types";
import { getFileUrl, uploadFile } from "@/lib/storage";
import { finalizeUsage, getUsageRequestId, reserveUsage } from "@/lib/usage";
import { runReservedUsageTask } from "@/lib/usage-route";
import { NextResponse } from "next/server";
import sharp from "sharp";

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

async function decodeBase64Image(b64Json: string) {
  const [, base64Payload] = b64Json.match(/^data:image\/\w+;base64,(.+)$/) || [];
  const imageBuffer = Buffer.from(base64Payload || b64Json, "base64");

  if (!imageBuffer.length) {
    throw new Error("Scene image provider returned an empty image.");
  }

  try {
    return await sharp(imageBuffer, { failOn: "error" }).png().toBuffer();
  } catch {
    throw new Error("Scene image provider returned invalid image data.");
  }
}

function getScenePlatform(platform: string | undefined, outputSettings: ReturnType<typeof sanitizeProductOutputSettings>) {
  if (outputSettings?.targetPlatform) {
    return outputSettings.targetPlatform;
  }

  return platform?.trim() || "taobao";
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
    const style = body.style?.trim() || "lifestyle";
    const generationMode = typeof body.generationMode === "string" ? body.generationMode.trim() || "faithful" : "faithful";
    const generationBrief = sanitizeProductGenerationBrief(body.generationBrief);
    const outputSettings = sanitizeProductOutputSettings(body.outputSettings);
    const platform = getScenePlatform(body.platform, outputSettings);

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
    const analysis = analysisRecord.output;

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
        analysis,
        scene,
        platform,
        outputSettings,
        style,
      }),
      buildProductGenerationBriefPrompt(generationBrief),
      buildProductVisualFidelityPrompt({
        analysis,
        generationMode,
      }),
    ].join("\n\n");
    const imageEditRoute = resolveImageEditRoute({
      task: "product-scene-image",
      outputSettings,
    }, { log: false });

    const usageReservation = await reserveUsage({
      userId: user.id,
      type: "image",
      model: imageEditRoute.modelId,
      requestId: getUsageRequestId(request),
      metadata: { route: "/api/products/scene-image", analysisHistoryId },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    const persistedResult = await runReservedUsageTask({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      logLabel: "scene image",
      task: async ({ addRefundMetadata, setFailureCode }) => {
        setFailureCode("STORAGE_ERROR");
        const sourceImageUrl = await getFileUrl(sourceAsset.url);
        setFailureCode("PROVIDER_ERROR");
        const editedImage = await editImage({
          imageUrl: sourceImageUrl,
          fileName: sourceAsset.name,
          prompt,
          task: "product-scene-image",
          model: imageEditRoute.model,
          outputSettings,
        });
        setFailureCode("INVALID_PROVIDER_OUTPUT");
        const imageBuffer = await decodeBase64Image(editedImage.b64Json);
        const title = getProductTitle(analysis, scene);
        const fileName = `${sanitizeAssetName(sourceAsset.name)}-${scene}-${Date.now()}.png`;
        setFailureCode("STORAGE_ERROR");
        const uploadedFile = await uploadFile({ userId: user.id, type: "image", name: fileName, content: imageBuffer, contentType: "image/png" });
        addRefundMetadata({ storagePath: uploadedFile.path });
        setFailureCode("ASSET_PERSIST_ERROR");
        const asset = await createAsset({ userId: user.id, type: "image", name: fileName, url: uploadedFile.path });
        addRefundMetadata({ assetId: asset.id });
        const output = {
          assetId: asset.id,
          storagePath: asset.url,
          prompt,
          provider: editedImage.provider,
          model: editedImage.model,
          modelId: editedImage.modelId || imageEditRoute.modelId,
          limitation: "基于原商品图编辑生成，尽量保持商品主体一致",
        };
        setFailureCode("HISTORY_PERSIST_ERROR");
        const history = await saveHistory({
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
          imageEditTask: "product-scene-image",
          imageProvider: imageEditRoute.provider,
          imageModel: imageEditRoute.model,
          imageModelId: imageEditRoute.modelId,
          generationMode,
          ...(generationBrief ? { generationBrief } : {}),
          ...(outputSettings ? { outputSettings } : {}),
          mustKeepDetails: analysis.mustKeepDetails || [],
          avoidChanges: analysis.avoidChanges || [],
        },
          output,
        });

        return { asset, history, uploadedFile };
      },
    });

    await finalizeUsage({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      metadata: {
        route: "/api/products/scene-image",
        analysisHistoryId,
        assetId: persistedResult.asset.id,
        historyId: persistedResult.history.id,
      },
    });

    return NextResponse.json({
      prompt,
      type: "商品场景图",
      status: "success" as const,
      imageUrl: persistedResult.uploadedFile.signedUrl,
      assetId: persistedResult.asset.id,
      storagePath: persistedResult.asset.url,
      historyId: persistedResult.history.id,
    });
  } catch (error) {
    return jsonError(error, "Product scene image generation failed.");
  }
}
