import { editImage } from "@/lib/ai/image-edit-provider";
import { resolveImageEditRoute } from "@/lib/ai/image-edit-router";
import { ApiError, jsonError } from "@/lib/api-errors";
import { createAsset, getAssetForUser } from "@/lib/assets";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, saveHistory } from "@/lib/history";
import { buildProductOutputSettingsPrompt } from "@/lib/ai/product-output-settings-prompt-builder";
import { sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import { getFileUrl, uploadFile } from "@/lib/storage";
import { classifyUsageFailure, finalizeUsage, getUsageRequestId, refundUsage, reserveUsage, type UsageFailureCode } from "@/lib/usage";
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

type ImageEditRequestBody = {
  assetId?: string;
  prompt?: string;
  model?: string;
  analysisHistoryId?: string;
  outputSettings?: unknown;
};

function sanitizeAssetName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "image-edit";
}

async function decodeBase64Image(b64Json: string) {
  const [, base64Payload] = b64Json.match(/^data:image\/\w+;base64,(.+)$/) || [];
  const imageBuffer = Buffer.from(base64Payload || b64Json, "base64");

  if (!imageBuffer.length) {
    throw new Error("Image edit provider returned an empty image.");
  }

  try {
    return await sharp(imageBuffer, { failOn: "error" }).png().toBuffer();
  } catch {
    throw new Error("Image edit provider returned invalid image data.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ImageEditRequestBody;
    const sourceAssetId = body.assetId?.trim();
    const prompt = body.prompt?.trim();
    const requestedModel = body.model?.trim();
    const analysisHistoryId = body.analysisHistoryId?.trim();
    const outputSettings = sanitizeProductOutputSettings(body.outputSettings);
    const imageEditTask = analysisHistoryId ? "product-image-edit" : "image-edit";
    const imageEditRoute = resolveImageEditRoute({
      task: imageEditTask,
      model: analysisHistoryId ? undefined : requestedModel,
      outputSettings,
    }, { log: false });

    if (!sourceAssetId) {
      return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const sourceAsset = await getAssetForUser(user.id, sourceAssetId);

    if (!sourceAsset) {
      return NextResponse.json({ error: "Image asset not found." }, { status: 404 });
    }

    if (sourceAsset.type !== "image" && sourceAsset.type !== "upload") {
      return NextResponse.json({ error: "Only image assets can be edited." }, { status: 400 });
    }

    if (analysisHistoryId) {
      const analysisRecord = await getHistoryRecordForUser(user.id, analysisHistoryId);

      if (!analysisRecord) {
        return NextResponse.json({ error: "Product analysis history not found." }, { status: 404 });
      }

      if (analysisRecord.type !== "product-analysis") {
        return NextResponse.json({ error: "History record is not a product analysis." }, { status: 400 });
      }

      if (analysisRecord.assetId !== sourceAssetId) {
        return NextResponse.json({ error: "Product analysis history does not match the source image asset." }, { status: 400 });
      }
    }

    const requestId = getUsageRequestId(request);
    const usageReservation = await reserveUsage({
      userId: user.id,
      type: "image-enhance",
      model: imageEditRoute.modelId,
      requestId,
      metadata: {
        route: "/api/image/edit",
        sourceAssetId,
        ...(analysisHistoryId ? { analysisHistoryId } : {}),
      },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    const persistedResult = await (async () => {
      let failureCode: UsageFailureCode = "STORAGE_ERROR";

      try {
        const finalPrompt = [prompt, buildProductOutputSettingsPrompt(outputSettings)].filter(Boolean).join("\n\n");
        const sourceImageUrl = await getFileUrl(sourceAsset.url);
        failureCode = "PROVIDER_ERROR";
        const editedImage = await editImage({
          imageUrl: sourceImageUrl,
          fileName: sourceAsset.name,
          prompt: finalPrompt,
          task: imageEditTask,
          model: imageEditRoute.model,
          outputSettings,
        });
        failureCode = "INVALID_PROVIDER_OUTPUT";
        const imageBuffer = await decodeBase64Image(editedImage.b64Json);

        const fileName = `${sanitizeAssetName(sourceAsset.name)}-edit-${Date.now()}.png`;
        failureCode = "STORAGE_ERROR";
        const uploadedFile = await uploadFile({
          userId: user.id,
          type: "image",
          name: fileName,
          content: imageBuffer,
          contentType: "image/png",
        });
        failureCode = "ASSET_PERSIST_ERROR";
        const asset = await createAsset({
          userId: user.id,
          type: "image",
          name: fileName,
          url: uploadedFile.path,
        });
        const historyInput = {
          source: analysisHistoryId ? "product-image-edit" : "run-image-edit",
          sourceAssetId,
          ...(analysisHistoryId ? { analysisHistoryId } : {}),
          prompt,
          ...(outputSettings ? { outputSettings } : {}),
          model: imageEditRoute.model,
          modelId: imageEditRoute.modelId,
          provider: imageEditRoute.provider,
          ...(requestedModel ? { requestedModel } : {}),
        };
        failureCode = "HISTORY_PERSIST_ERROR";
        const history = await saveHistory({
          userId: user.id,
          assetId: asset.id,
          type: "image-enhance",
          title: `${sourceAsset.name} 图片编辑`,
          input: historyInput,
          output: {
            assetId: asset.id,
            provider: editedImage.provider,
            model: editedImage.model,
            modelId: editedImage.modelId,
          },
        });

        return { asset, history, uploadedFile };
      } catch (error) {
        try {
          await refundUsage({
            usageRecordId: usageReservation.record.id,
            userId: user.id,
            failureCode: classifyUsageFailure(error, failureCode),
          });
        } catch (refundError) {
          console.error("[usage] image edit refund failed", {
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
        route: "/api/image/edit",
        sourceAssetId,
        ...(analysisHistoryId ? { analysisHistoryId } : {}),
        assetId: persistedResult.asset.id,
        historyId: persistedResult.history.id,
      },
    });

    return NextResponse.json({
      imageUrl: persistedResult.uploadedFile.signedUrl,
      assetId: persistedResult.asset.id,
    });
  } catch (error) {
    return jsonError(error, "Image edit failed.");
  }
}
