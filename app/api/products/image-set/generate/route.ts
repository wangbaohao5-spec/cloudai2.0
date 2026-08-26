import { editImage } from "@/lib/ai/image-edit-provider";
import { resolveImageEditRoute } from "@/lib/ai/image-edit-router";
import { buildProductImageSetImagePrompt } from "@/lib/ai/product-image-set-image-prompt-builder";
import {
  type ProductImageSetCount,
  type ProductImageSetImageType,
  type ProductImageSetPlanImage,
  type ProductImageSetPurpose,
} from "@/lib/ai/product-image-set-plan-prompt-builder";
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

type ProductImageSetGenerateRequestBody = {
  analysisHistoryId?: string;
  count?: number;
  generationBrief?: unknown;
  generationMode?: string;
  image?: Partial<ProductImageSetPlanImage>;
  outputSettings?: unknown;
  purpose?: string;
};

const IMAGE_SET_PURPOSES = ["detail-page", "platform-listing", "quick-listing", "social-seeding"] as const;
const IMAGE_SET_IMAGE_TYPES = [
  "brand-story",
  "comparison",
  "cta",
  "detail-closeup",
  "four-grid-detail",
  "hero",
  "model-wearing",
  "multi-angle",
  "selling-point",
  "size-spec",
  "usage-scene",
  "white-background",
] as const;
const PRODUCT_VISUAL_GENERATION_MODES = ["faithful", "creative"] as const;

function isImageSetPurpose(value: string): value is ProductImageSetPurpose {
  return IMAGE_SET_PURPOSES.includes(value as ProductImageSetPurpose);
}

function isImageSetCount(value: number): value is ProductImageSetCount {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

function isImageSetImageType(value: string): value is ProductImageSetImageType {
  return IMAGE_SET_IMAGE_TYPES.includes(value as ProductImageSetImageType);
}

function isProductVisualGenerationMode(value: string): value is ProductVisualGenerationMode {
  return PRODUCT_VISUAL_GENERATION_MODES.includes(value as ProductVisualGenerationMode);
}

async function decodeBase64Image(b64Json: string) {
  const [, base64Payload] = b64Json.match(/^data:image\/\w+;base64,(.+)$/) || [];
  const imageBuffer = Buffer.from(base64Payload || b64Json, "base64");

  if (!imageBuffer.length) {
    throw new Error("Image set provider returned an empty image.");
  }

  try {
    return await sharp(imageBuffer, { failOn: "error" }).png().toBuffer();
  } catch {
    throw new Error("Image set provider returned invalid image data.");
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

function normalizeImage(image: ProductImageSetGenerateRequestBody["image"], count: ProductImageSetCount): ProductImageSetPlanImage | null {
  if (!image || typeof image !== "object") {
    return null;
  }

  const imageIndex = Number(image.imageIndex);
  const imageType = normalizeText(image.imageType);
  const suggestedGenerationMode = normalizeText(image.suggestedGenerationMode);

  if (!Number.isInteger(imageIndex) || imageIndex < 1 || imageIndex > count || !isImageSetImageType(imageType)) {
    return null;
  }

  return {
    imageIndex,
    imageType,
    title: normalizeText(image.title),
    goal: normalizeText(image.goal),
    headline: normalizeText(image.headline),
    subheadline: normalizeText(image.subheadline),
    keyMessage: normalizeText(image.keyMessage),
    visualDirection: normalizeText(image.visualDirection),
    requiredElements: normalizeStringArray(image.requiredElements),
    mustKeep: normalizeStringArray(image.mustKeep),
    avoid: normalizeStringArray(image.avoid),
    suggestedGenerationMode: isProductVisualGenerationMode(suggestedGenerationMode) ? suggestedGenerationMode : "faithful",
  };
}

function getGenerationMode(requestedMode: unknown, image: ProductImageSetPlanImage) {
  const explicitMode = normalizeText(requestedMode);

  if (explicitMode) {
    return isProductVisualGenerationMode(explicitMode) ? explicitMode : null;
  }

  return image.suggestedGenerationMode || "faithful";
}

function getProductTitle(analysis: { category?: string; productNameSuggestions?: string[] }, image: ProductImageSetPlanImage) {
  const productName = analysis.productNameSuggestions?.[0] || analysis.category || "商品";

  return `${productName} 套图第 ${image.imageIndex} 张`;
}

function sanitizeAssetName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "product-image-set";
}

function isGeminiImageError(error: unknown) {
  return error instanceof Error && error.message.startsWith("Gemini ");
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductImageSetGenerateRequestBody;
    const analysisHistoryId = body.analysisHistoryId?.trim();
    const purpose = body.purpose?.trim() || "detail-page";
    const count = Number(body.count || 7);
    const generationBrief = sanitizeProductGenerationBrief(body.generationBrief);
    const outputSettings = sanitizeProductOutputSettings(body.outputSettings);

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    if (!isImageSetPurpose(purpose)) {
      return NextResponse.json({ error: "套图用途无效，请重新选择。" }, { status: 400 });
    }

    if (!isImageSetCount(count)) {
      return NextResponse.json({ error: "套图数量无效，请选择 1 到 12 张。" }, { status: 400 });
    }

    const image = normalizeImage(body.image, count);

    if (!image) {
      return NextResponse.json({ error: "套图规划图片无效，请重新生成规划。" }, { status: 400 });
    }

    const generationMode = getGenerationMode(body.generationMode, image);

    if (!generationMode) {
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

    const prompt = buildProductImageSetImagePrompt({
      analysis,
      generationBrief,
      generationMode,
      image,
      outputSettings,
      productTitle: analysisRecord.title,
      purpose,
    });
    const imageEditRoute = resolveImageEditRoute({
      task: "product-image-set",
      outputSettings,
    }, { log: false });

    const usageReservation = await reserveUsage({
      userId: user.id,
      type: "image",
      model: imageEditRoute.modelId,
      requestId: getUsageRequestId(request),
      metadata: { route: "/api/products/image-set/generate", analysisHistoryId, imageIndex: image.imageIndex },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    const persistedResult = await runReservedUsageTask({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      logLabel: "image set image",
      task: async ({ addRefundMetadata, setFailureCode }) => {
        setFailureCode("STORAGE_ERROR");
        const sourceImageUrl = await getFileUrl(sourceAsset.url);
        setFailureCode("PROVIDER_ERROR");
        const editedImage = await editImage({ imageUrl: sourceImageUrl, fileName: sourceAsset.name, prompt, task: "product-image-set", model: imageEditRoute.model, outputSettings });
        setFailureCode("INVALID_PROVIDER_OUTPUT");
        const imageBuffer = await decodeBase64Image(editedImage.b64Json);
        const fileName = `${sanitizeAssetName(sourceAsset.name)}-image-set-${image.imageIndex}-${Date.now()}.png`;
        setFailureCode("STORAGE_ERROR");
        const uploadedFile = await uploadFile({ userId: user.id, type: "image", name: fileName, content: imageBuffer, contentType: "image/png" });
        addRefundMetadata({ storagePath: uploadedFile.path });
        setFailureCode("ASSET_PERSIST_ERROR");
        const asset = await createAsset({ userId: user.id, type: "image", name: fileName, url: uploadedFile.path });
        addRefundMetadata({ assetId: asset.id });
        const output = {
          imageUrl: uploadedFile.signedUrl,
          assetId: asset.id,
          storagePath: asset.url,
          prompt,
          image,
          purpose,
          provider: editedImage.provider,
          model: editedImage.model,
          modelId: editedImage.modelId || imageEditRoute.modelId,
          limitation: "AI 生成图中文字可能需要人工检查",
        };
        setFailureCode("HISTORY_PERSIST_ERROR");
        const history = await saveHistory({
          userId: user.id,
        assetId: asset.id,
        type: "image",
          title: getProductTitle(analysis, image),
        input: {
          source: "product-image-set",
          analysisHistoryId: analysisRecord.id,
          sourceAssetId: analysisRecord.assetId,
          purpose,
          count,
          imageEditTask: "product-image-set",
          imageProvider: imageEditRoute.provider,
          imageModel: imageEditRoute.model,
          imageModelId: imageEditRoute.modelId,
          imageIndex: image.imageIndex,
          imageType: image.imageType,
          generationMode,
          ...(generationBrief ? { generationBrief } : {}),
          ...(outputSettings ? { outputSettings } : {}),
          mustKeepDetails: analysis.mustKeepDetails || [],
          avoidChanges: analysis.avoidChanges || [],
          image,
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
        route: "/api/products/image-set/generate",
        analysisHistoryId,
        imageIndex: image.imageIndex,
        assetId: persistedResult.asset.id,
        historyId: persistedResult.history.id,
      },
    });

    return NextResponse.json({
      status: "success" as const,
      type: "商品套图",
      imageUrl: persistedResult.uploadedFile.signedUrl,
      assetId: persistedResult.asset.id,
      storagePath: persistedResult.asset.url,
      historyId: persistedResult.history.id,
      prompt,
      image,
      purpose,
    });
  } catch (error) {
    if (isGeminiImageError(error)) {
      return NextResponse.json(
        {
          error: "Gemini 图片模型生成失败，请切回默认模型或稍后重试。",
          debug: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
        },
        { status: 500 },
      );
    }

    return jsonError(error, "Product image set image generation failed.");
  }
}
