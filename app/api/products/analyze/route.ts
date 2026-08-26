import { analyzeProductImageAsset } from "@/lib/ai/product-analysis";
import { DashScopeVisionError } from "@/lib/ai/providers/dashscope-vision";
import { getAssetForUser } from "@/lib/assets";
import { ApiError, jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { saveHistory } from "@/lib/history";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { getFileUrl } from "@/lib/storage";
import { classifyUsageFailure, finalizeUsage, getUsageRequestId, refundUsage, reserveUsage, type UsageFailureCode } from "@/lib/usage";
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

    const requestId = getUsageRequestId(request);
    const usageReservation = await reserveUsage({
      userId: user.id,
      type: "product-analysis",
      model: "dashscope-vision",
      requestId,
      metadata: {
        route: "/api/products/analyze",
        assetId: asset.id,
      },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    const persistedResult = await (async () => {
      let failureCode: UsageFailureCode = "STORAGE_ERROR";

      try {
        const imageUrl = await getFileUrl(asset.url, 30 * 60);

        if (isDevelopment()) {
          console.info("[product-analyze] storage", {
            hasStoragePath: Boolean(asset.url),
            signedUrlGenerated: Boolean(imageUrl),
          });
        }

        failureCode = "PROVIDER_ERROR";
        const analysis = await analyzeProductImageAsset(imageUrl, productHint);
        const title = getAnalysisTitle(analysis);
        failureCode = "HISTORY_PERSIST_ERROR";
        const history = await saveHistory({
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
        });

        return { analysis, history, title };
      } catch (error) {
        if (failureCode === "STORAGE_ERROR") {
          console.error("[product-analyze] signed url failed", {
            hasStoragePath: Boolean(asset.url),
            errorMessage: error instanceof Error ? error.message : String(error),
            ...getErrorCauseDetails(error),
          });
        }

        try {
          await refundUsage({
            usageRecordId: usageReservation.record.id,
            userId: user.id,
            failureCode: classifyUsageFailure(error, failureCode),
          });
        } catch (refundError) {
          console.error("[usage] product analysis refund failed", {
            usageRecordId: usageReservation.record.id,
            error: refundError instanceof Error ? refundError.message : String(refundError),
          });
        }

        if (failureCode === "STORAGE_ERROR") {
          throw new ApiError(PRODUCT_ANALYSIS_STORAGE_MESSAGE, 500);
        }

        throw error;
      }
    })();

    await finalizeUsage({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      metadata: {
        route: "/api/products/analyze",
        assetId: asset.id,
        historyId: persistedResult.history.id,
      },
    });

    return NextResponse.json({
      assetId: asset.id,
      historyId: persistedResult.history.id,
      title: persistedResult.title,
      analysis: persistedResult.analysis,
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
