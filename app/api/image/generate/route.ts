import { generateImage } from "@/lib/ai/image-provider";
import { resolveRoutedImageModel } from "@/lib/ai/image-router";
import { buildImagePrompt } from "@/lib/ai/image-prompt-builder";
import { saveRemoteAsset } from "@/lib/asset-ingest";
import { getCurrentUser } from "@/lib/current-user";
import { ApiError, jsonError } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import type { ImageGenerationFormData } from "@/lib/types";
import { finalizeUsage, getUsageRequestId, reserveUsage } from "@/lib/usage";
import { runReservedUsageTask } from "@/lib/usage-route";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ImageGenerationFormData;
    const product = body.product?.trim();

    if (!product) {
      return NextResponse.json({ error: "Product is required." }, { status: 400 });
    }

    const prompt = buildImagePrompt({
      product,
      platform: body.platform,
      purpose: body.purpose,
      style: body.style,
    });
    const imageRoute = resolveRoutedImageModel("product-main-image");

    const usageReservation = await reserveUsage({
      userId: user.id,
      type: imageRoute.usageType,
      model: imageRoute.model,
      requestId: getUsageRequestId(request),
      metadata: { route: "/api/image/generate" },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    const persistedResult = await runReservedUsageTask({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      logLabel: "image generation",
      task: async ({ addRefundMetadata, setFailureCode }) => {
        const generatedImage = await generateImage({ task: "product-main-image", prompt });
        setFailureCode("STORAGE_ERROR");
        const storedAsset = await saveRemoteAsset({
          userId: user.id,
          type: "image",
          sourceUrl: generatedImage.imageUrl,
          name: `${product}-${generatedImage.taskId || Date.now()}`,
        });
        addRefundMetadata({ assetId: storedAsset.asset.id, storagePath: storedAsset.asset.url });
        const output = {
          assetId: storedAsset.asset.id,
          storagePath: storedAsset.asset.url,
          taskId: generatedImage.taskId,
          prompt,
          provider: generatedImage.provider,
          model: generatedImage.model,
          modelId: generatedImage.modelId,
        };
        setFailureCode("HISTORY_PERSIST_ERROR");
        const history = await saveHistory({
          userId: user.id,
          assetId: storedAsset.asset.id,
          type: "image",
          title: product,
          input: body,
          output,
        });

        return { generatedImage, history, storedAsset };
      },
    });

    await finalizeUsage({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      metadata: {
        route: "/api/image/generate",
        assetId: persistedResult.storedAsset.asset.id,
        historyId: persistedResult.history.id,
      },
    });

    return NextResponse.json({
      prompt,
      type: body.purpose || "AI 图片",
      status: "success" as const,
      imageUrl: persistedResult.storedAsset.signedUrl,
      taskId: persistedResult.generatedImage.taskId,
      assetId: persistedResult.storedAsset.asset.id,
      storagePath: persistedResult.storedAsset.asset.url,
    });
  } catch (error) {
    return jsonError(error, "Image generation failed.");
  }
}
