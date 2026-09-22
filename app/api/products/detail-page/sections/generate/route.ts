import { randomUUID } from "node:crypto";
import { editImage } from "@/lib/ai/image-edit-provider";
import { createProviderDiagnostic, logProviderDiagnostic } from "@/lib/ai/provider-observability";
import { resolveImageEditRoute } from "@/lib/ai/image-edit-router";
import { buildProductDetailPageSectionPrompt } from "@/lib/ai/product-detail-page-section-prompt-builder";
import { ApiError, jsonError } from "@/lib/api-errors";
import { getAssetForUser } from "@/lib/assets";
import { getCurrentUser } from "@/lib/current-user";
import { getDetailPageAssetCandidates } from "@/lib/detail-page-assets";
import {
  consumeDetailPageSectionGenerationIntent,
  failDetailPageSectionGeneration,
  persistGeneratedDetailPageSection,
  recoverGeneratedDetailPageSection,
} from "@/lib/detail-page-section-generation";
import { logDetailPageGenerationTrigger } from "@/lib/detail-page-generation-diagnostics";
import { cleanupGeneratedAssetAfterFailure } from "@/lib/generated-asset-cleanup";
import { getHistoryRecordForUser } from "@/lib/history";
import { sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import { isProductImageAnalysis } from "@/lib/product-copywriting";
import { getFileUrl, uploadFile } from "@/lib/storage";
import { finalizeUsage, getUsageRequestId, reserveUsage } from "@/lib/usage";
import { runReservedUsageTask } from "@/lib/usage-route";
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

type DetailPageSectionGenerateBody = {
  analysisHistoryId?: string;
  expectedRevision?: number;
  intentId?: string;
  outputSettings?: unknown;
  sectionId?: string;
};

function cleanId(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

function sanitizeAssetName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "detail-page-section";
}

async function decodeBase64Image(b64Json: string) {
  const [, base64Payload] = b64Json.match(/^data:image\/\w+;base64,(.+)$/) || [];
  const imageBuffer = Buffer.from(base64Payload || b64Json, "base64");

  if (!imageBuffer.length) {
    throw new Error("Detail page section provider returned an empty image.");
  }

  try {
    return await sharp(imageBuffer, { failOn: "error" }).png().toBuffer();
  } catch {
    throw new Error("Detail page section provider returned invalid image data.");
  }
}

async function getCanonicalProductReference(userId: string, analysisHistoryId: string) {
  const analysisRecord = await getHistoryRecordForUser(userId, analysisHistoryId);

  if (!analysisRecord) throw new ApiError("Product analysis history not found.", 404);
  if (analysisRecord.type !== "product-analysis") throw new ApiError("History record is not a product analysis.", 400);
  if (!isProductImageAnalysis(analysisRecord.output)) throw new ApiError("Product analysis result is invalid.", 400);
  if (!analysisRecord.assetId) throw new ApiError("需要补充商品参考素材。", 422);

  const sourceAsset = await getAssetForUser(userId, analysisRecord.assetId);

  if (!sourceAsset || (sourceAsset.type !== "image" && sourceAsset.type !== "upload")) {
    throw new ApiError("需要补充商品参考素材。", 422);
  }

  return { analysisRecord, sourceAsset };
}

async function getRecoveredResponse(userId: string, analysisHistoryId: string, sectionId: string, requestId: string) {
  const recovered = await recoverGeneratedDetailPageSection({ analysisHistoryId, requestId, sectionId, userId });

  if (!recovered) return null;

  const candidates = await getDetailPageAssetCandidates(userId, analysisHistoryId);
  return {
    candidate: candidates.find((candidate) => candidate.assetId === recovered.assetId) || null,
    project: recovered.project,
    recovered: true as const,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as DetailPageSectionGenerateBody;
    const analysisHistoryId = cleanId(body.analysisHistoryId);
    const sectionId = cleanId(body.sectionId);
    const intentId = cleanId(body.intentId);
    const expectedRevision = Number(body.expectedRevision);
    const outputSettings = sanitizeProductOutputSettings(body.outputSettings);
    const requestId = getUsageRequestId(request);

    if (!analysisHistoryId || !sectionId || !intentId) {
      throw new ApiError("详情页商品和模块不能为空。", 400);
    }

    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
      throw new ApiError("详情页策划版本无效，请刷新后重试。", 400);
    }

    const alreadyCompleted = await getRecoveredResponse(user.id, analysisHistoryId, sectionId, requestId);

    if (alreadyCompleted) {
      return NextResponse.json(alreadyCompleted, { headers: { "Cache-Control": "no-store" } });
    }

    const { analysisRecord, sourceAsset } = await getCanonicalProductReference(user.id, analysisHistoryId);
    const generationOperationId = randomUUID();
    const consumed = await consumeDetailPageSectionGenerationIntent({
      analysisHistoryId,
      expectedRevision,
      generationOperationId,
      intentId,
      requestId,
      sectionId,
      userId: user.id,
    });

    logDetailPageGenerationTrigger({
      event: consumed.alreadyConsumed ? "intent-rejected" : "intent-consumed",
      eventType: consumed.intent.eventType,
      intentId,
      moduleType: consumed.section.moduleType,
      navigationType: consumed.intent.navigationType,
      pagePhase: consumed.intent.pagePhase,
      projectRevision: consumed.project.revision,
      requestId,
      sectionId,
    });

    if (consumed.alreadyConsumed) {
      const recovered = await getRecoveredResponse(user.id, analysisHistoryId, sectionId, requestId);
      if (recovered) return NextResponse.json(recovered, { headers: { "Cache-Control": "no-store" } });
      throw new ApiError("本次视觉生成仍在处理或已经结束，请刷新后查看。", 409);
    }

    const prepared = consumed;
    let prompt: string;
    let imageEditRoute: ReturnType<typeof resolveImageEditRoute>;
    let usageReservation: Awaited<ReturnType<typeof reserveUsage>>;

    try {
      prompt = buildProductDetailPageSectionPrompt({
        pageStyle: prepared.project.pageStyle,
        productTitle: analysisRecord.title,
        section: prepared.section,
      });
      imageEditRoute = resolveImageEditRoute({ task: "product-detail-page", outputSettings }, { log: false });
      usageReservation = await reserveUsage({
        userId: user.id,
        type: "image",
        model: imageEditRoute.modelId,
        requestId,
        metadata: {
          route: "/api/products/detail-page/sections/generate",
          analysisHistoryId,
          detailPageProjectId: prepared.project.projectId,
          sectionId,
          moduleType: prepared.section.moduleType,
        },
      });
    } catch (error) {
      await failDetailPageSectionGeneration({ analysisHistoryId, generationOperationId, sectionId, userId: user.id }).catch(() => null);
      throw error;
    }

    if (!usageReservation.created) {
      const recovered = await getRecoveredResponse(user.id, analysisHistoryId, sectionId, requestId);

      if (recovered) {
        return NextResponse.json(recovered, { headers: { "Cache-Control": "no-store" } });
      }

      await failDetailPageSectionGeneration({ analysisHistoryId, generationOperationId, sectionId, userId: user.id }).catch(() => null);
      throw new ApiError("本次视觉生成仍在处理或已经结束，请刷新后查看。", 409);
    }

    const generationTotalStartedAt = performance.now();
    const diagnosticContext = { intentId, moduleType: prepared.section.moduleType, requestId, sectionId };
    const persistedResult = await runReservedUsageTask({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      logLabel: "detail page V2 section visual",
      task: async ({ addRefundMetadata, setFailureCode }) => {
        let generatedStoragePath: string | undefined;

        try {
          setFailureCode("STORAGE_ERROR");
          const sourceImageUrl = await getFileUrl(sourceAsset.url);
          setFailureCode("PROVIDER_ERROR");
          const editedImage = await editImage({
            imageUrl: sourceImageUrl,
            fileName: sourceAsset.name,
            prompt,
            task: "product-detail-page",
            model: imageEditRoute.model,
            outputSettings,
            diagnosticContext,
          });
          setFailureCode("INVALID_PROVIDER_OUTPUT");
          const imageBuffer = await decodeBase64Image(editedImage.b64Json);
          const fileName = `${sanitizeAssetName(sourceAsset.name)}-detail-v2-${prepared.section.moduleType.toLowerCase()}-${Date.now()}.png`;
          setFailureCode("STORAGE_ERROR");
          const storageStartedAt = performance.now();
          logProviderDiagnostic(createProviderDiagnostic({
            context: diagnosticContext,
            elapsedMs: 0,
            host: "storage",
            provider: imageEditRoute.provider,
            stage: "STORAGE_UPLOAD_START",
            task: "product-detail-page",
            totalElapsedMs: storageStartedAt - generationTotalStartedAt,
          }));
          let uploadedFile: Awaited<ReturnType<typeof uploadFile>>;
          try {
            uploadedFile = await uploadFile({
              userId: user.id,
              type: "image",
              name: fileName,
              content: imageBuffer,
              contentType: "image/png",
            });
          } catch (error) {
            logProviderDiagnostic(createProviderDiagnostic({
              context: diagnosticContext,
              elapsedMs: performance.now() - storageStartedAt,
              error,
              event: "provider-failure",
              host: "storage",
              provider: imageEditRoute.provider,
              stage: "STORAGE_UPLOAD_END",
              task: "product-detail-page",
              totalElapsedMs: performance.now() - generationTotalStartedAt,
            }));
            throw error;
          }
          logProviderDiagnostic(createProviderDiagnostic({
            context: diagnosticContext,
            elapsedMs: performance.now() - storageStartedAt,
            host: "storage",
            provider: imageEditRoute.provider,
            stage: "STORAGE_UPLOAD_END",
            task: "product-detail-page",
            totalElapsedMs: performance.now() - generationTotalStartedAt,
          }));
          generatedStoragePath = uploadedFile.path;
          addRefundMetadata({ storagePath: uploadedFile.path });
          setFailureCode("ASSET_PERSIST_ERROR");
          const persisted = await persistGeneratedDetailPageSection({
            analysisHistoryId,
            assetName: fileName,
            assetStoragePath: uploadedFile.path,
            generationOperationId,
            historyInput: {
              source: "detail-page-v2",
              analysisHistoryId,
              detailPageProjectId: prepared.project.projectId,
              sectionId,
              moduleType: prepared.section.moduleType,
              requestId,
              sourceAssetId: sourceAsset.id,
              imageEditTask: "product-detail-page",
              imageProvider: imageEditRoute.provider,
              imageModel: imageEditRoute.model,
              imageModelId: imageEditRoute.modelId,
              ...(outputSettings ? { outputSettings } : {}),
            },
            historyOutput: {
              prompt,
              provider: editedImage.provider,
              model: editedImage.model,
              modelId: editedImage.modelId || imageEditRoute.modelId,
              sectionId,
              moduleType: prepared.section.moduleType,
              source: "detail-page-v2",
            },
            historyTitle: `${analysisRecord.title} · ${prepared.section.order} ${prepared.section.moduleType}`,
            requestId,
            sectionId,
            userId: user.id,
          });

          return { ...persisted, uploadedFile };
        } catch (error) {
          if (generatedStoragePath) {
            await cleanupGeneratedAssetAfterFailure({
              logLabel: "detail-page-v2-section",
              storagePath: generatedStoragePath,
              userId: user.id,
            });
          }

          try {
            await failDetailPageSectionGeneration({ analysisHistoryId, generationOperationId, sectionId, userId: user.id });
          } catch (settlementError) {
            console.warn("[detail-page-v2] failure state settlement failed", {
              errorName: settlementError instanceof Error ? settlementError.name : typeof settlementError,
              sectionId,
            });
          }

          throw error;
        }
      },
    });

    let warning: string | null = null;

    try {
      await finalizeUsage({
        usageRecordId: usageReservation.record.id,
        userId: user.id,
        metadata: {
          route: "/api/products/detail-page/sections/generate",
          analysisHistoryId,
          detailPageProjectId: persistedResult.project.projectId,
          sectionId,
          assetId: persistedResult.asset.id,
          historyId: persistedResult.history.id,
        },
      });
    } catch {
      warning = "视觉已保存，额度状态暂未确认。";
    }

    return NextResponse.json(
      {
        project: persistedResult.project,
        candidate: {
          assetId: persistedResult.asset.id,
          assetType: persistedResult.asset.type,
          createdAt: persistedResult.asset.createdAt.toISOString(),
          historyId: persistedResult.history.id,
          imageType: prepared.section.moduleType.toLowerCase(),
          name: persistedResult.asset.name,
          previewUrl: persistedResult.uploadedFile.signedUrl,
          productRelationEvidence: "history-analysis-id",
          sourceType: "detail-page",
          suggestedModuleTypes: [prepared.section.moduleType],
        },
        recovered: false as const,
        warning,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error, "详情页视觉生成失败，请稍后重试。");
  }
}
