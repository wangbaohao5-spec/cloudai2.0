import { generateAIResponse } from "@/lib/ai/deepseek";
import {
  buildProductDetailPagePlanPrompt,
  type ProductDetailPagePlan,
  type ProductDetailPagePlanPage,
  type ProductDetailPageStyle,
} from "@/lib/ai/product-detail-page-plan-prompt-builder";
import { jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { getHistoryRecordForUser, getProductRelatedHistory } from "@/lib/history";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ProductDetailPagePlanRequestBody = {
  analysisHistoryId?: string;
  count?: number;
  style?: string;
};

const DETAIL_PAGE_STYLES = ["brand-site", "ecommerce", "minimal", "xiaohongshu"] as const;

function isDetailPageStyle(value: string): value is ProductDetailPageStyle {
  return DETAIL_PAGE_STYLES.includes(value as ProductDetailPageStyle);
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

function normalizePlanPage(value: unknown, index: number): ProductDetailPagePlanPage {
  const page = value && typeof value === "object" ? (value as Partial<ProductDetailPagePlanPage>) : {};
  const pageIndex = Number(page.pageIndex) || index + 1;
  const sectionType = pageIndex === 1 ? "hero" : pageIndex === 3 ? "cta" : "feature";

  return {
    pageIndex,
    sectionType,
    sectionTitle: normalizeText(page.sectionTitle) || (pageIndex === 1 ? "首屏卖点" : pageIndex === 2 ? "核心功能" : "购买理由"),
    headline: normalizeText(page.headline),
    subheadline: normalizeText(page.subheadline),
    sellingPoint: normalizeText(page.sellingPoint),
    visualDirection: normalizeText(page.visualDirection),
    bodyCopy: normalizeText(page.bodyCopy),
    notes: normalizeText(page.notes),
  };
}

function normalizePlan(plan: ProductDetailPagePlan): ProductDetailPagePlan {
  const pages = Array.isArray(plan.pages) ? plan.pages.slice(0, 3).map(normalizePlanPage) : [];

  if (pages.length !== 3) {
    throw new Error("Detail page plan must include exactly 3 pages.");
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
    const count = body.count || 3;

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    if (count !== 3) {
      return NextResponse.json({ error: "MVP only supports 3 detail pages." }, { status: 400 });
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
      count: 3,
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
    const plan = normalizePlan(parseJsonResponse(response));

    return NextResponse.json({
      count: 3,
      style,
      ...plan,
    });
  } catch (error) {
    return jsonError(error, "Product detail page plan generation failed.");
  }
}
