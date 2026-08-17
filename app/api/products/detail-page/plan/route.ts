import { generateAIResponse } from "@/lib/ai/text-router";
import {
  buildProductDetailPagePlanPrompt,
  type ProductDetailPageCount,
  type ProductDetailPagePlan,
  type ProductDetailPagePlanPage,
  type ProductDetailPageSectionType,
  type ProductDetailPageStyle,
} from "@/lib/ai/product-detail-page-plan-prompt-builder";
import { jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, getProductRelatedHistory } from "@/lib/history";
import { sanitizeProductGenerationBrief } from "@/lib/product-generation-brief";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductDetailPagePlanRequestBody = {
  analysisHistoryId?: string;
  count?: number;
  generationBrief?: unknown;
  style?: string;
};

const DETAIL_PAGE_STYLES = ["brand-site", "ecommerce", "minimal", "xiaohongshu"] as const;
const DETAIL_PAGE_COUNTS = [3, 5, 8] as const;
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

function isDetailPageCount(value: number): value is ProductDetailPageCount {
  return DETAIL_PAGE_COUNTS.includes(value as ProductDetailPageCount);
}

function isSectionType(value: string): value is ProductDetailPageSectionType {
  return SECTION_TYPES.includes(value as ProductDetailPageSectionType);
}

function parseJsonResponse(response: string) {
  const trimmed = response.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(withoutFence) as ProductDetailPagePlan;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getFallbackSectionType(index: number, count: ProductDetailPageCount): ProductDetailPageSectionType {
  if (index === 0) {
    return "hero";
  }

  if (index === count - 1) {
    return "cta";
  }

  if (count === 3) {
    return "selling-point";
  }

  if (count === 5) {
    return (["selling-point", "usage-scene", "detail-closeup"] as ProductDetailPageSectionType[])[index - 1] || "selling-point";
  }

  return (
    (["selling-point", "usage-scene", "detail-closeup", "four-grid-detail", "material-detail", "specification"] as ProductDetailPageSectionType[])[index - 1] ||
    "selling-point"
  );
}

function normalizePlanPage(value: unknown, index: number, count: ProductDetailPageCount): ProductDetailPagePlanPage {
  const page = value && typeof value === "object" ? (value as Partial<ProductDetailPagePlanPage>) : {};
  const pageIndex = index + 1;
  const sectionType = normalizeText(page.sectionType);
  const normalizedSectionType = isSectionType(sectionType) ? sectionType : getFallbackSectionType(index, count);

  return {
    pageIndex,
    sectionType: normalizedSectionType,
    sectionTitle: normalizeText(page.sectionTitle) || (pageIndex === 1 ? "首屏卖点" : pageIndex === count ? "购买理由" : "详情页模块"),
    headline: normalizeText(page.headline),
    subheadline: normalizeText(page.subheadline),
    sellingPoint: normalizeText(page.sellingPoint),
    visualDirection: normalizeText(page.visualDirection),
    bodyCopy: normalizeText(page.bodyCopy),
    notes: normalizeText(page.notes),
  };
}

function normalizePlan(plan: ProductDetailPagePlan, count: ProductDetailPageCount): ProductDetailPagePlan {
  const pages = Array.isArray(plan.pages) ? plan.pages.slice(0, count).map((page, index) => normalizePlanPage(page, index, count)) : [];

  if (pages.length !== count) {
    throw new Error(`Detail page plan must include exactly ${count} pages.`);
  }

  return { pages };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductDetailPagePlanRequestBody;
    const analysisHistoryId = body.analysisHistoryId?.trim();
    const style = body.style?.trim() || "ecommerce";
    const count = Number(body.count || 3);
    const generationBrief = sanitizeProductGenerationBrief(body.generationBrief);

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    if (!isDetailPageCount(count)) {
      return NextResponse.json({ error: "详情页数量无效，请选择 3、5 或 8 张。" }, { status: 400 });
    }

    if (!isDetailPageStyle(style)) {
      return NextResponse.json({ error: "Unsupported detail page style." }, { status: 400 });
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

    const relatedHistory = await getProductRelatedHistory({
      userId: user.id,
      analysisHistoryId: analysisRecord.id,
      sourceAssetId: analysisRecord.assetId,
    });
    const copywritingRecords = relatedHistory.filter((record) => record.type === "copywriting");
    const prompt = buildProductDetailPagePlanPrompt({
      analysis: analysisRecord.output,
      copywritingRecords,
      count,
      generationBrief,
      productTitle: analysisRecord.title,
      style,
    });
    const response = await generateAIResponse(
      [
        {
          role: "system",
          content: "你是 CloudAI 的电商详情页规划助手，只输出严格 JSON，不输出 Markdown 或解释。",
        },
        { role: "user", content: prompt },
      ],
      { jsonMode: true, temperature: 0.62 },
    );
    const plan = normalizePlan(parseJsonResponse(response), count);

    return NextResponse.json({
      count,
      style,
      ...plan,
    });
  } catch (error) {
    return jsonError(error, "Product detail page plan generation failed.");
  }
}
