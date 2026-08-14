import { editImage } from "@/lib/ai/image-edit-provider";
import { buildProductDetailPageImagePrompt } from "@/lib/ai/product-detail-page-image-prompt-builder";
import type { ProductDetailPagePlanPage, ProductDetailPageStyle } from "@/lib/ai/product-detail-page-plan-prompt-builder";
import { jsonError, settleTask } from "@/lib/api-errors";
import { createAsset, getAssetForUser } from "@/lib/assets";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, saveHistory } from "@/lib/history";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import { getFileUrl, uploadFile } from "@/lib/storage";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductDetailPageGenerateRequestBody = {
  analysisHistoryId?: string;
  page?: Partial<ProductDetailPagePlanPage>;
  style?: string;
};

const DETAIL_PAGE_STYLES = ["brand-site", "ecommerce", "minimal", "xiaohongshu"] as const;
const SECTION_TYPES = ["cta", "feature", "hero"] as const;

function isDetailPageStyle(value: string): value is ProductDetailPageStyle {
  return DETAIL_PAGE_STYLES.includes(value as ProductDetailPageStyle);
}

function isSectionType(value: string): value is ProductDetailPagePlanPage["sectionType"] {
  return SECTION_TYPES.includes(value as ProductDetailPagePlanPage["sectionType"]);
}

function decodeBase64Image(b64Json: string) {
  const [, base64Payload] = b64Json.match(/^data:image\/\w+;base64,(.+)$/) || [];

  return Buffer.from(base64Payload || b64Json, "base64");
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

  if (!Number.isInteger(pageIndex) || pageIndex < 1 || pageIndex > 3 || !isSectionType(sectionType)) {
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
    const style = body.style?.trim() || "ecommerce";
    const page = normalizePage(body.page);

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    if (!isDetailPageStyle(style)) {
      return NextResponse.json({ error: "Unsupported detail page style." }, { status: 400 });
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

    const prompt = buildProductDetailPageImagePrompt({
      analysis: analysisRecord.output,
      page,
      productTitle: analysisRecord.title,
      style,
    });
    const model = "gpt-image-2";

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "image",
      model: "gpt-image-2:product-detail-page",
    });

    const sourceImageUrl = await getFileUrl(sourceAsset.url);
    const editedImage = await editImage({
      imageUrl: sourceImageUrl,
      fileName: sourceAsset.name,
      prompt,
      model,
    });
    const imageBuffer = decodeBase64Image(editedImage.b64Json);
    const fileName = `${sanitizeAssetName(sourceAsset.name)}-detail-page-${page.pageIndex}-${Date.now()}.png`;
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
      page,
      provider: editedImage.provider,
      model: editedImage.model,
      modelId: "run-api-gpt-image-2-product-detail-page",
      limitation: "AI 生成图中文字可能需要人工检查",
    };
    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        assetId: asset.id,
        type: "image",
        title: getProductTitle(analysisRecord.output, page),
        input: {
          source: "product-detail-page",
          analysisHistoryId: analysisRecord.id,
          sourceAssetId: analysisRecord.assetId,
          pageIndex: page.pageIndex,
          style,
          page,
        },
        output,
      }),
    );
    const warnings = [historyResult.error].filter((warning): warning is string => Boolean(warning));

    return NextResponse.json({
      status: "success" as const,
      type: "商品详情页",
      imageUrl: uploadedFile.signedUrl,
      assetId: asset.id,
      storagePath: asset.url,
      historyId: historyResult.data?.id,
      prompt,
      page,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Product detail page image generation failed.");
  }
}
