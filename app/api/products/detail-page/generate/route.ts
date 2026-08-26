import { editImage } from "@/lib/ai/image-edit-provider";
import { resolveImageEditRoute } from "@/lib/ai/image-edit-router";
import { buildProductDetailPageImagePrompt } from "@/lib/ai/product-detail-page-image-prompt-builder";
import type { ProductDetailPagePlanPage, ProductDetailPageStyle } from "@/lib/ai/product-detail-page-plan-prompt-builder";
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

type ProductDetailPageGenerateRequestBody = {
  analysisHistoryId?: string;
  generationMode?: string;
  generationBrief?: unknown;
  outputSettings?: unknown;
  page?: Partial<ProductDetailPagePlanPage>;
  style?: string;
};

const DETAIL_PAGE_STYLES = ["brand-site", "ecommerce", "minimal", "xiaohongshu"] as const;
const PRODUCT_VISUAL_GENERATION_MODES = ["faithful", "creative"] as const;
const SECTION_TYPES = [
  "comparison",
  "cta",
  "detail-closeup",
  "feature",
  "flat-lay",
  "four-grid-detail",
  "hero",
  "material-detail",
  "model-wearing",
  "multi-color",
  "selling-point",
  "specification",
  "trust",
  "usage-scene",
] as const;

function isDetailPageStyle(value: string): value is ProductDetailPageStyle {
  return DETAIL_PAGE_STYLES.includes(value as ProductDetailPageStyle);
}

function isSectionType(value: string): value is ProductDetailPagePlanPage["sectionType"] {
  return SECTION_TYPES.includes(value as ProductDetailPagePlanPage["sectionType"]);
}

function isProductVisualGenerationMode(value: string): value is ProductVisualGenerationMode {
  return PRODUCT_VISUAL_GENERATION_MODES.includes(value as ProductVisualGenerationMode);
}

async function decodeBase64Image(b64Json: string) {
  const [, base64Payload] = b64Json.match(/^data:image\/\w+;base64,(.+)$/) || [];
  const imageBuffer = Buffer.from(base64Payload || b64Json, "base64");

  if (!imageBuffer.length) {
    throw new Error("Detail page provider returned an empty image.");
  }

  try {
    return await sharp(imageBuffer, { failOn: "error" }).png().toBuffer();
  } catch {
    throw new Error("Detail page provider returned invalid image data.");
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePage(page: ProductDetailPageGenerateRequestBody["page"]): ProductDetailPagePlanPage | null {
  if (!page || typeof page !== "object") {
    return null;
  }

  const pageIndex = Number(page.pageIndex);
  const sectionType = normalizeText(page.sectionType);

  if (!Number.isInteger(pageIndex) || pageIndex < 1 || pageIndex > 8 || !isSectionType(sectionType)) {
    return null;
  }

  return {
    pageIndex,
    sectionType,
    sectionTitle: normalizeText(page.sectionTitle),
    headline: normalizeText(page.headline),
    subheadline: normalizeText(page.subheadline),
    sellingPoint: normalizeText(page.sellingPoint),
    visualDirection: normalizeText(page.visualDirection),
    bodyCopy: normalizeText(page.bodyCopy),
    notes: normalizeText(page.notes),
  };
}

function getProductTitle(analysis: { category?: string; productNameSuggestions?: string[] }, page: ProductDetailPagePlanPage) {
  const productName = analysis.productNameSuggestions?.[0] || analysis.category || "商品";

  return `${productName} 详情页第 ${page.pageIndex} 张`;
}

function sanitizeAssetName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "product-detail-page";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductDetailPageGenerateRequestBody;
    const analysisHistoryId = body.analysisHistoryId?.trim();
    const generationMode = typeof body.generationMode === "string" ? body.generationMode.trim() || "faithful" : "faithful";
    const style = body.style?.trim() || "ecommerce";
    const page = normalizePage(body.page);
    const generationBrief = sanitizeProductGenerationBrief(body.generationBrief);
    const outputSettings = sanitizeProductOutputSettings(body.outputSettings);

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    if (!isDetailPageStyle(style)) {
      return NextResponse.json({ error: "Unsupported detail page style." }, { status: 400 });
    }

    if (!isProductVisualGenerationMode(generationMode)) {
      return NextResponse.json({ error: "生成模式无效，请重新选择。" }, { status: 400 });
    }

    if (!page) {
      return NextResponse.json({ error: "Detail page plan is invalid." }, { status: 400 });
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
      buildProductDetailPageImagePrompt({
        analysis,
        generationBrief,
        outputSettings,
        page,
        productTitle: analysisRecord.title,
        style,
      }),
      buildProductVisualFidelityPrompt({
        analysis,
        generationMode,
      }),
    ].join("\n\n");
    const imageEditRoute = resolveImageEditRoute({
      task: "product-detail-page",
      outputSettings,
    }, { log: false });

    const usageReservation = await reserveUsage({
      userId: user.id,
      type: "image",
      model: imageEditRoute.modelId,
      requestId: getUsageRequestId(request),
      metadata: { route: "/api/products/detail-page/generate", analysisHistoryId, pageIndex: page.pageIndex },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    const persistedResult = await runReservedUsageTask({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      logLabel: "detail page image",
      task: async ({ addRefundMetadata, setFailureCode }) => {
        setFailureCode("STORAGE_ERROR");
        const sourceImageUrl = await getFileUrl(sourceAsset.url);
        setFailureCode("PROVIDER_ERROR");
        const editedImage = await editImage({ imageUrl: sourceImageUrl, fileName: sourceAsset.name, prompt, task: "product-detail-page", model: imageEditRoute.model, outputSettings });
        setFailureCode("INVALID_PROVIDER_OUTPUT");
        const imageBuffer = await decodeBase64Image(editedImage.b64Json);
        const fileName = `${sanitizeAssetName(sourceAsset.name)}-detail-page-${page.pageIndex}-${Date.now()}.png`;
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
          page,
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
        title: getProductTitle(analysis, page),
        input: {
          source: "product-detail-page",
          analysisHistoryId: analysisRecord.id,
          sourceAssetId: analysisRecord.assetId,
          pageIndex: page.pageIndex,
          style,
          imageEditTask: "product-detail-page",
          imageProvider: imageEditRoute.provider,
          imageModel: imageEditRoute.model,
          imageModelId: imageEditRoute.modelId,
          generationMode,
          ...(generationBrief ? { generationBrief } : {}),
          ...(outputSettings ? { outputSettings } : {}),
          mustKeepDetails: analysis.mustKeepDetails || [],
          avoidChanges: analysis.avoidChanges || [],
          page,
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
        route: "/api/products/detail-page/generate",
        analysisHistoryId,
        pageIndex: page.pageIndex,
        assetId: persistedResult.asset.id,
        historyId: persistedResult.history.id,
      },
    });

    return NextResponse.json({
      status: "success" as const,
      type: "商品详情页",
      imageUrl: persistedResult.uploadedFile.signedUrl,
      assetId: persistedResult.asset.id,
      storagePath: persistedResult.asset.url,
      historyId: persistedResult.history.id,
      prompt,
      page,
    });
  } catch (error) {
    return jsonError(error, "Product detail page image generation failed.");
  }
}
