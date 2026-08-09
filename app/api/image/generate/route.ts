import { generateImage } from "@/lib/ai/image-provider";
import { resolveRoutedImageModel } from "@/lib/ai/image-router";
import { buildImagePrompt } from "@/lib/ai/image-prompt-builder";
import { saveRemoteAsset } from "@/lib/asset-ingest";
import { getCurrentUser } from "@/lib/current-user";
import { jsonError, settleTask } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import type { ImageGenerationFormData } from "@/lib/types";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
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

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: imageRoute.usageType,
      model: imageRoute.model,
    });

    const generatedImage = await generateImage({
      task: "product-main-image",
      prompt,
    });
    const storedAssetResult = await settleTask(
      saveRemoteAsset({
        userId: user.id,
        type: "image",
        sourceUrl: generatedImage.imageUrl,
        name: `${product}-${generatedImage.taskId || Date.now()}`,
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
      provider: generatedImage.provider,
      model: generatedImage.model,
      modelId: generatedImage.modelId,
    };
    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        assetId: storedAsset?.asset.id || null,
        type: "image",
        title: product,
        input: body,
        output,
      }),
    );
    const warnings = [storedAssetResult.error, historyResult.error].filter(Boolean);

    return NextResponse.json({
      prompt,
      type: body.purpose || "AI 图片",
      status: "success" as const,
      imageUrl,
      taskId: generatedImage.taskId,
      assetId: storedAsset?.asset.id,
      storagePath: storedAsset?.asset.url,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Image generation failed.");
  }
}
