import { editImage } from "@/lib/ai/image-edit-provider";
import { buildProductImageSetImagePrompt } from "@/lib/ai/product-image-set-image-prompt-builder";
import {
  type ProductImageSetCount,
  type ProductImageSetImageType,
  type ProductImageSetPlanImage,
  type ProductImageSetPurpose,
} from "@/lib/ai/product-image-set-plan-prompt-builder";
import { jsonError, settleTask } from "@/lib/api-errors";
import { createAsset, getAssetForUser } from "@/lib/assets";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, saveHistory } from "@/lib/history";
import { sanitizeProductGenerationBrief } from "@/lib/product-generation-brief";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import type { ProductVisualGenerationMode } from "@/lib/product-types";
import { getFileUrl, uploadFile } from "@/lib/storage";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductImageSetGenerateRequestBody = {
  analysisHistoryId?: string;
  count?: number;
  generationBrief?: unknown;
  generationMode?: string;
  image?: Partial<ProductImageSetPlanImage>;
  purpose?: string;
};

const IMAGE_SET_PURPOSES = ["detail-page", "platform-listing", "quick-listing", "social-seeding"] as const;
const IMAGE_SET_COUNTS = [3, 5, 7, 8] as const;
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
  return IMAGE_SET_COUNTS.includes(value as ProductImageSetCount);
}

function isImageSetImageType(value: string): value is ProductImageSetImageType {
  return IMAGE_SET_IMAGE_TYPES.includes(value as ProductImageSetImageType);
}

function isProductVisualGenerationMode(value: string): value is ProductVisualGenerationMode {
  return PRODUCT_VISUAL_GENERATION_MODES.includes(value as ProductVisualGenerationMode);
}

function decodeBase64Image(b64Json: string) {
  const [, base64Payload] = b64Json.match(/^data:image\/\w+;base64,(.+)$/) || [];

  return Buffer.from(base64Payload || b64Json, "base64");
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

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    if (!isImageSetPurpose(purpose)) {
      return NextResponse.json({ error: "套图用途无效，请重新选择。" }, { status: 400 });
    }

    if (!isImageSetCount(count)) {
      return NextResponse.json({ error: "套图数量无效，请选择 3、5、7 或 8 张。" }, { status: 400 });
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
      analysis: analysisRecord.output,
      generationBrief,
      generationMode,
      image,
      productTitle: analysisRecord.title,
      purpose,
    });
    const model = "gpt-image-2";

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "image",
      model: "gpt-image-2:product-image-set",
    });

    const sourceImageUrl = await getFileUrl(sourceAsset.url);
    const editedImage = await editImage({
      imageUrl: sourceImageUrl,
      fileName: sourceAsset.name,
      prompt,
      model,
    });
    const imageBuffer = decodeBase64Image(editedImage.b64Json);
    const fileName = `${sanitizeAssetName(sourceAsset.name)}-image-set-${image.imageIndex}-${Date.now()}.png`;
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
      image,
      purpose,
      provider: editedImage.provider,
      model: editedImage.model,
      modelId: "run-api-gpt-image-2-product-image-set",
      limitation: "AI 生成图中文字可能需要人工检查",
    };
    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        assetId: asset.id,
        type: "image",
        title: getProductTitle(analysisRecord.output, image),
        input: {
          source: "product-image-set",
          analysisHistoryId: analysisRecord.id,
          sourceAssetId: analysisRecord.assetId,
          purpose,
          count,
          imageIndex: image.imageIndex,
          imageType: image.imageType,
          generationMode,
          ...(generationBrief ? { generationBrief } : {}),
          mustKeepDetails: analysisRecord.output.mustKeepDetails || [],
          avoidChanges: analysisRecord.output.avoidChanges || [],
          image,
        },
        output,
      }),
    );
    const warnings = [historyResult.error].filter((warning): warning is string => Boolean(warning));

    return NextResponse.json({
      status: "success" as const,
      type: "商品套图",
      imageUrl: uploadedFile.signedUrl,
      assetId: asset.id,
      storagePath: asset.url,
      historyId: historyResult.data?.id,
      prompt,
      image,
      purpose,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Product image set image generation failed.");
  }
}
