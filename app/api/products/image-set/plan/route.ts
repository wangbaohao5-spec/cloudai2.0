import { generateText } from "@/lib/ai/text-router";
import {
  buildProductImageSetPlanPrompt,
  type ProductImageSetCount,
  type ProductImageSetImageType,
  type ProductImageSetPlan,
  type ProductImageSetPlanImage,
  type ProductImageSetPurpose,
} from "@/lib/ai/product-image-set-plan-prompt-builder";
import { jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser } from "@/lib/history";
import { sanitizeProductGenerationBrief } from "@/lib/product-generation-brief";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import type { ProductVisualGenerationMode } from "@/lib/product-types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductImageSetPlanRequestBody = {
  analysisHistoryId?: string;
  count?: number;
  generationBrief?: unknown;
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
const GENERATION_MODES = ["creative", "faithful"] as const;

function isImageSetPurpose(value: string): value is ProductImageSetPurpose {
  return IMAGE_SET_PURPOSES.includes(value as ProductImageSetPurpose);
}

function isImageSetCount(value: number): value is ProductImageSetCount {
  return IMAGE_SET_COUNTS.includes(value as ProductImageSetCount);
}

function isImageSetImageType(value: string): value is ProductImageSetImageType {
  return IMAGE_SET_IMAGE_TYPES.includes(value as ProductImageSetImageType);
}

function isGenerationMode(value: string): value is ProductVisualGenerationMode {
  return GENERATION_MODES.includes(value as ProductVisualGenerationMode);
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

function parseJsonResponse(response: string) {
  const trimmed = response.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(withoutFence) as ProductImageSetPlan;
}

function getFallbackImageType(index: number, count: ProductImageSetCount): ProductImageSetImageType {
  if (index === 0) {
    return "hero";
  }

  if (index === count - 1) {
    return "cta";
  }

  return (["selling-point", "usage-scene", "detail-closeup", "four-grid-detail", "size-spec", "multi-angle"] as ProductImageSetImageType[])[index - 1] || "selling-point";
}

function normalizePlanImage(value: unknown, index: number, count: ProductImageSetCount): ProductImageSetPlanImage {
  const image = value && typeof value === "object" ? (value as Partial<ProductImageSetPlanImage>) : {};
  const imageIndex = index + 1;
  const imageType = normalizeText(image.imageType);
  const suggestedGenerationMode = normalizeText(image.suggestedGenerationMode);

  return {
    imageIndex,
    imageType: isImageSetImageType(imageType) ? imageType : getFallbackImageType(index, count),
    title: normalizeText(image.title) || (imageIndex === 1 ? "首屏主视觉" : imageIndex === count ? "总结购买理由图" : "商品套图模块"),
    goal: normalizeText(image.goal),
    headline: normalizeText(image.headline),
    subheadline: normalizeText(image.subheadline),
    keyMessage: normalizeText(image.keyMessage),
    visualDirection: normalizeText(image.visualDirection),
    requiredElements: normalizeStringArray(image.requiredElements),
    mustKeep: normalizeStringArray(image.mustKeep),
    avoid: normalizeStringArray(image.avoid),
    suggestedGenerationMode: isGenerationMode(suggestedGenerationMode) ? suggestedGenerationMode : "faithful",
  };
}

function normalizePlan(plan: ProductImageSetPlan, purpose: ProductImageSetPurpose, count: ProductImageSetCount): ProductImageSetPlan {
  const images = Array.isArray(plan.images) ? plan.images.slice(0, count).map((image, index) => normalizePlanImage(image, index, count)) : [];

  if (images.length !== count) {
    throw new Error(`Image set plan must include exactly ${count} images.`);
  }

  return {
    purpose,
    count,
    images,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductImageSetPlanRequestBody;
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

    const prompt = buildProductImageSetPlanPrompt({
      analysis: analysisRecord.output,
      count,
      generationBrief,
      productTitle: analysisRecord.title,
      purpose,
    });
    const response = await generateText({
      messages: [
        {
          role: "system",
          content: "你是 CloudAI 的电商商品套图规划助手，只输出严格 JSON，不输出 Markdown 或解释。",
        },
        { role: "user", content: prompt },
      ],
      jsonMode: true,
      task: "image-set-plan",
      temperature: 0.62,
    });
    const plan = normalizePlan(parseJsonResponse(response), purpose, count);

    return NextResponse.json(plan);
  } catch (error) {
    return jsonError(error, "Product image set plan generation failed.");
  }
}
