import { analyzeProductImageAsset } from "@/lib/ai/product-analysis";
import { DashScopeVisionError } from "@/lib/ai/providers/dashscope-vision";
import { getAssetForUser } from "@/lib/assets";
import { ApiError, jsonError, settleTask } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { saveHistory } from "@/lib/history";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { getFileUrl } from "@/lib/storage";
import { enforceUsageLimit, recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const PRODUCT_ANALYSIS_UNAVAILABLE_MESSAGE = "商品图片分析服务暂时不可用，请稍后重试。";
const PRODUCT_ANALYSIS_FALLBACK_MESSAGE = "商品分析失败，请稍后重试。";
const PRODUCT_ANALYSIS_STORAGE_MESSAGE = "商品图片读取失败，请重新上传后再试。";

type ProductAnalyzeRequestBody = {
  assetId?: string;
  productHint?: string;
};

function getAnalysisTitle(analysis: ProductAnalysisResponse["analysis"]) {
  return analysis.productNameSuggestions[0] || analysis.category || "商品图片分析";
}

function getErrorCauseDetails(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;

  if (!cause || typeof cause !== "object") {
    return {};
  }

  const causeRecord = cause as {
    code?: unknown;
    errno?: unknown;
    hostname?: unknown;
    message?: unknown;
    syscall?: unknown;
  };

  return {
    causeMessage: typeof causeRecord.message === "string" ? causeRecord.message : undefined,
    causeCode: typeof causeRecord.code === "string" ? causeRecord.code : undefined,
    causeErrno: typeof causeRecord.errno === "number" || typeof causeRecord.errno === "string" ? causeRecord.errno : undefined,
    causeSyscall: typeof causeRecord.syscall === "string" ? causeRecord.syscall : undefined,
    causeHostname: typeof causeRecord.hostname === "string" ? causeRecord.hostname : undefined,
  };
}

function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

function getSafeDebug(error: unknown) {
  if (error instanceof DashScopeVisionError) {
    return error.safeDebug || [error.status, error.code].filter(Boolean).join(" ");
  }

  return undefined;
}

function getAnalysisErrorStatus(error: unknown) {
  if (error instanceof DashScopeVisionError) {
    return error.status === 401 || error.status === 403 || error.status === 429 ? error.status : 500;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProductAnalyzeRequestBody;
    const assetId = body.assetId?.trim();
    const productHint = typeof body.productHint === "string" ? body.productHint.trim() : "";

    if (!assetId) {
      return NextResponse.json({ error: "请先上传商品图片。" }, { status: 400 });
    }

    if (productHint.length > 1000) {
      return NextResponse.json({ error: "商品补充信息过长，请精简到 1000 字以内。" }, { status: 400 });
    }

    const asset = await getAssetForUser(user.id, assetId);

    if (isDevelopment()) {
      console.info("[product-analyze] request", {
        hasUser: Boolean(user),
        hasAssetId: Boolean(assetId),
        assetFound: Boolean(asset),
        assetType: asset?.type,
        hasStoragePath: Boolean(asset?.url),
      });
    }

    if (!asset || asset.type !== "upload") {
      return NextResponse.json({ error: "商品图片不存在或无权访问，请重新上传。" }, { status: 404 });
    }

    await enforceUsageLimit({
      userId: user.id,
      type: "product-analysis",
      model: "dashscope-vision",
    });

    let imageUrl: string;

    try {
      imageUrl = await getFileUrl(asset.url, 30 * 60);

      if (isDevelopment()) {
        console.info("[product-analyze] storage", {
          hasStoragePath: Boolean(asset.url),
          signedUrlGenerated: Boolean(imageUrl),
        });
      }
    } catch (error) {
      console.error("[product-analyze] signed url failed", {
        hasStoragePath: Boolean(asset.url),
        errorMessage: error instanceof Error ? error.message : String(error),
        ...getErrorCauseDetails(error),
      });

      return NextResponse.json({ error: PRODUCT_ANALYSIS_STORAGE_MESSAGE }, { status: 500 });
    }

    const analysis = await analyzeProductImageAsset(imageUrl, productHint);
    const title = getAnalysisTitle(analysis);
    const [historyResult, usageResult] = await Promise.all([
      settleTask(
        saveHistory({
          userId: user.id,
          assetId: asset.id,
          type: "product-analysis",
          title,
          input: {
            assetId: asset.id,
            assetName: asset.name,
            ...(productHint ? { productHint } : {}),
          },
          output: analysis,
        }),
      ),
      settleTask(
        recordUsage({
          userId: user.id,
          type: "product-analysis",
          model: "dashscope-vision",
        }),
      ),
    ]);
    const warnings = [historyResult.error, usageResult.error].filter((warning): warning is string => Boolean(warning));

    return NextResponse.json({
      assetId: asset.id,
      historyId: historyResult.data?.id,
      title,
      analysis,
      warnings: warnings.length ? warnings : undefined,
    } satisfies ProductAnalysisResponse);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error, PRODUCT_ANALYSIS_FALLBACK_MESSAGE);
    }

    console.error("[product-analysis] failed", {
      errorMessage: error instanceof Error ? error.message : String(error),
      ...getErrorCauseDetails(error),
    });

    const message =
      error instanceof DashScopeVisionError
        ? error.message
        : error instanceof Error && error.message === PRODUCT_ANALYSIS_UNAVAILABLE_MESSAGE
          ? error.message
          : PRODUCT_ANALYSIS_FALLBACK_MESSAGE;
    const debug = isDevelopment() ? getSafeDebug(error) : undefined;

    return NextResponse.json(
      {
        error: message,
        ...(debug ? { debug } : {}),
      },
      { status: getAnalysisErrorStatus(error) },
    );
  }
}
