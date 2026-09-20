import { ApiError } from "@/lib/api-errors";
import { db } from "@/lib/db";
import {
  DETAIL_PAGE_MODULE_DEFINITIONS,
  DETAIL_PAGE_PROJECT_HISTORY_TYPE,
  evaluateDetailPageReadiness,
  getActiveDetailPageGeneration,
  getDetailPageProjectRecordId,
  type DetailPageModuleType,
  type DetailPageProjectV2,
  type DetailPageSectionV2,
  parseDetailPageProject,
} from "@/lib/detail-page-project";
import { finalizeUsage, refundUsage } from "@/lib/usage";
import type { Prisma } from "@prisma/client";

export const DETAIL_PAGE_GENERATABLE_MODULE_TYPES = [
  "HERO",
  "BENEFITS",
  "USAGE_SCENE",
  "PRODUCT_DETAIL",
  "BRAND_CONTENT",
] as const satisfies readonly DetailPageModuleType[];

const SAFE_GENERATION_ERROR = "视觉生成失败，请稍后重试。";
const SAFE_INTERRUPTED_GENERATION_ERROR = "上次视觉制作已中断，请按需重试。";
export const DETAIL_PAGE_GENERATION_STALE_MS = 10 * 60 * 1000;

type GeneratedSectionPersistenceInput = {
  analysisHistoryId: string;
  assetName: string;
  assetStoragePath: string;
  generationOperationId: string;
  historyInput: Record<string, unknown>;
  historyOutput: Record<string, unknown>;
  historyTitle: string;
  requestId: string;
  sectionId: string;
  userId: string;
};

function isGeneratableModule(moduleType: DetailPageModuleType): moduleType is (typeof DETAIL_PAGE_GENERATABLE_MODULE_TYPES)[number] {
  return DETAIL_PAGE_GENERATABLE_MODULE_TYPES.includes(moduleType as (typeof DETAIL_PAGE_GENERATABLE_MODULE_TYPES)[number]);
}

function findSection(project: DetailPageProjectV2, sectionId: string) {
  const section = project.sections.find((item) => item.id === sectionId);

  if (!section) {
    throw new ApiError("详情页模块不存在。", 404);
  }

  return section;
}

export function assertDetailPageSectionGenerationEligibility(section: DetailPageSectionV2) {
  if (!isGeneratableModule(section.moduleType)) {
    throw new ApiError("当前模块不需要生成视觉素材。", 422);
  }

  const readinessWithoutAsset = evaluateDetailPageReadiness(section.moduleType, section.evidence, null);

  if (readinessWithoutAsset !== "READY") {
    const inputLabel = DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType].inputLabel;
    throw new ApiError(`请先补充并确认${inputLabel}。`, 422);
  }

  return section;
}

function parseProjectRecord(
  record: { output: Prisma.JsonValue } | null,
  expected: { analysisHistoryId: string; userId: string },
) {
  if (!record) {
    throw new ApiError("详情页策划不存在，请重新创建。", 404);
  }

  const project = parseDetailPageProject(record.output, expected);

  if (!project) {
    throw new ApiError("详情页策划数据不可用，请重新创建。", 409);
  }

  return project;
}

export async function prepareDetailPageSectionGeneration({
  analysisHistoryId,
  expectedRevision,
  sectionId,
  userId,
}: {
  analysisHistoryId: string;
  expectedRevision: number;
  sectionId: string;
  userId: string;
}) {
  const record = await db.historyRecord.findFirst({
    where: {
      id: getDetailPageProjectRecordId(analysisHistoryId),
      type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
      userId,
    },
    select: { output: true },
  });
  let project = parseProjectRecord(record, { analysisHistoryId, userId });

  if (getActiveDetailPageGeneration(project)) {
    project = await reconcileStaleDetailPageGeneration({ analysisHistoryId, project, userId });
  }

  if (project.revision !== expectedRevision) {
    throw new ApiError("详情页策划已在其他页面更新，请刷新后重试。", 409);
  }

  if (getActiveDetailPageGeneration(project)) {
    throw new ApiError("当前详情页已有视觉正在制作，请稍后再试。", 409);
  }

  return { project, section: assertDetailPageSectionGenerationEligibility(findSection(project, sectionId)) };
}

export async function beginDetailPageSectionGeneration({
  analysisHistoryId,
  expectedRevision,
  generationOperationId,
  requestId,
  sectionId,
  userId,
}: {
  analysisHistoryId: string;
  expectedRevision: number;
  generationOperationId: string;
  requestId: string;
  sectionId: string;
  userId: string;
}) {
  const { project } = await prepareDetailPageSectionGeneration({ analysisHistoryId, expectedRevision, sectionId, userId });
  const nextProject: DetailPageProjectV2 = {
    ...project,
    revision: project.revision + 1,
    updatedAt: new Date().toISOString(),
    sections: project.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            generationOperationId,
            generationRequestId: requestId,
            generationStartedAt: new Date().toISOString(),
            lastError: null,
            lifecycle: "GENERATING",
          }
        : section,
    ),
  };
  const result = await db.historyRecord.updateMany({
    where: {
      id: getDetailPageProjectRecordId(analysisHistoryId),
      userId,
      type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
      output: { path: ["revision"], equals: expectedRevision },
    },
    data: { output: nextProject as unknown as Prisma.InputJsonValue },
  });

  if (!result.count) {
    throw new ApiError("详情页策划已在其他页面更新，请刷新后重试。", 409);
  }

  return nextProject;
}

export async function failDetailPageSectionGeneration({
  analysisHistoryId,
  generationOperationId,
  sectionId,
  userId,
}: {
  analysisHistoryId: string;
  generationOperationId: string;
  sectionId: string;
  userId: string;
}) {
  const recordId = getDetailPageProjectRecordId(analysisHistoryId);
  const record = await db.historyRecord.findFirst({
    where: { id: recordId, type: DETAIL_PAGE_PROJECT_HISTORY_TYPE, userId },
    select: { output: true },
  });
  const project = parseProjectRecord(record, { analysisHistoryId, userId });
  const section = findSection(project, sectionId);

  if (section.generationOperationId !== generationOperationId || section.lifecycle !== "GENERATING") {
    return null;
  }

  const nextProject: DetailPageProjectV2 = {
    ...project,
    revision: project.revision + 1,
    updatedAt: new Date().toISOString(),
    sections: project.sections.map((item) =>
      item.id === sectionId
        ? {
            ...item,
            generationOperationId: null,
            generationStartedAt: null,
            lastError: SAFE_GENERATION_ERROR,
            lifecycle: item.selectedAssetId ? "COMPLETE" : "FAILED",
          }
        : item,
    ),
  };
  const result = await db.historyRecord.updateMany({
    where: {
      id: recordId,
      userId,
      type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
      output: { path: ["revision"], equals: project.revision },
    },
    data: { output: nextProject as unknown as Prisma.InputJsonValue },
  });

  return result.count ? nextProject : null;
}

export async function persistGeneratedDetailPageSection(input: GeneratedSectionPersistenceInput) {
  const recordId = getDetailPageProjectRecordId(input.analysisHistoryId);

  return db.$transaction(async (tx) => {
    const record = await tx.historyRecord.findFirst({
      where: { id: recordId, type: DETAIL_PAGE_PROJECT_HISTORY_TYPE, userId: input.userId },
      select: { output: true },
    });
    const project = parseProjectRecord(record, { analysisHistoryId: input.analysisHistoryId, userId: input.userId });
    const section = findSection(project, input.sectionId);

    if (section.lifecycle !== "GENERATING" || section.generationOperationId !== input.generationOperationId || section.generationRequestId !== input.requestId) {
      throw new ApiError("本次视觉生成状态已失效，结果未绑定。", 409);
    }

    const asset = await tx.asset.create({
      data: {
        name: input.assetName,
        type: "image",
        url: input.assetStoragePath,
        userId: input.userId,
      },
    });
    const history = await tx.historyRecord.create({
      data: {
        assetId: asset.id,
        input: input.historyInput as Prisma.InputJsonValue,
        output: { ...input.historyOutput, assetId: asset.id, storagePath: asset.url } as Prisma.InputJsonValue,
        title: input.historyTitle,
        type: "image",
        userId: input.userId,
      },
    });
    const nextProject: DetailPageProjectV2 = {
      ...project,
      revision: project.revision + 1,
      updatedAt: new Date().toISOString(),
      sections: project.sections.map((item) =>
        item.id === input.sectionId
          ? {
              ...item,
              assetSource: "generated",
              generationOperationId: null,
              generationStartedAt: null,
              lastError: null,
              lifecycle: "COMPLETE",
              readiness: "EXISTING_ASSET",
              selectedAssetId: asset.id,
            }
          : item,
      ),
    };
    const result = await tx.historyRecord.updateMany({
      where: {
        id: recordId,
        userId: input.userId,
        type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
        output: { path: ["revision"], equals: project.revision },
      },
      data: { output: nextProject as unknown as Prisma.InputJsonValue },
    });

    if (!result.count) {
      throw new ApiError("详情页策划已更新，本次结果未绑定。", 409);
    }

    return { asset, history, project: nextProject };
  });
}

export async function recoverGeneratedDetailPageSection({
  analysisHistoryId,
  requestId,
  sectionId,
  userId,
}: {
  analysisHistoryId: string;
  requestId: string;
  sectionId: string;
  userId: string;
}) {
  const record = await db.historyRecord.findFirst({
    where: {
      id: getDetailPageProjectRecordId(analysisHistoryId),
      type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
      userId,
    },
    select: { output: true },
  });
  const project = parseProjectRecord(record, { analysisHistoryId, userId });
  const section = findSection(project, sectionId);

  if (section.generationRequestId !== requestId || !section.selectedAssetId || section.lifecycle !== "COMPLETE") {
    return null;
  }

  return { assetId: section.selectedAssetId, project };
}

async function loadCurrentProject(userId: string, analysisHistoryId: string) {
  const record = await db.historyRecord.findFirst({
    where: {
      id: getDetailPageProjectRecordId(analysisHistoryId),
      type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
      userId,
    },
    select: { output: true },
  });

  return parseProjectRecord(record, { analysisHistoryId, userId });
}

async function persistReconciledProject(project: DetailPageProjectV2, sectionId: string, assetId?: string | null) {
  const nextProject: DetailPageProjectV2 = {
    ...project,
    revision: project.revision + 1,
    updatedAt: new Date().toISOString(),
    sections: project.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            ...(assetId ? { assetSource: "generated" as const, readiness: "EXISTING_ASSET" as const, selectedAssetId: assetId } : {}),
            generationOperationId: null,
            generationStartedAt: null,
            lastError: assetId ? null : SAFE_INTERRUPTED_GENERATION_ERROR,
            lifecycle: assetId || section.selectedAssetId ? "COMPLETE" : "FAILED",
          }
        : section,
    ),
  };
  const result = await db.historyRecord.updateMany({
    where: {
      id: getDetailPageProjectRecordId(project.analysisHistoryId),
      userId: project.userId,
      type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
      output: { path: ["revision"], equals: project.revision },
    },
    data: { output: nextProject as unknown as Prisma.InputJsonValue },
  });

  if (result.count) return nextProject;
  return loadCurrentProject(project.userId, project.analysisHistoryId);
}

export async function reconcileStaleDetailPageGeneration({
  analysisHistoryId,
  now = new Date(),
  project,
  userId,
}: {
  analysisHistoryId: string;
  now?: Date;
  project?: DetailPageProjectV2;
  userId: string;
}) {
  const currentProject = project || await loadCurrentProject(userId, analysisHistoryId);
  const section = getActiveDetailPageGeneration(currentProject);

  if (!section) return currentProject;

  const startedAt = section.generationStartedAt || currentProject.updatedAt;
  if (now.getTime() - Date.parse(startedAt) < DETAIL_PAGE_GENERATION_STALE_MS) {
    return currentProject;
  }

  const requestId = section.generationRequestId;
  if (!requestId) {
    return persistReconciledProject(currentProject, section.id);
  }

  const durableHistory = await db.historyRecord.findFirst({
    where: {
      userId,
      type: "image",
      assetId: { not: null },
      AND: [
        { input: { path: ["source"], equals: "detail-page-v2" } },
        { input: { path: ["analysisHistoryId"], equals: analysisHistoryId } },
        { input: { path: ["sectionId"], equals: section.id } },
        { input: { path: ["requestId"], equals: requestId } },
      ],
    },
    select: { assetId: true, id: true },
  });
  const usageRecord = await db.usageRecord.findFirst({
    where: { requestId, userId },
    select: { id: true, status: true },
  });

  if (durableHistory?.assetId) {
    if (usageRecord?.status === "pending") {
      try {
        await finalizeUsage({
          usageRecordId: usageRecord.id,
          userId,
          metadata: {
            route: "/api/products/detail-page/sections/generate",
            analysisHistoryId,
            sectionId: section.id,
            assetId: durableHistory.assetId,
            historyId: durableHistory.id,
            reconciliation: "stale-generation-durable-result",
          },
        });
      } catch {
        return currentProject;
      }
    }

    return persistReconciledProject(currentProject, section.id, durableHistory.assetId);
  }

  if (usageRecord?.status === "pending") {
    try {
      await refundUsage({
        usageRecordId: usageRecord.id,
        userId,
        failureCode: "INTERNAL_ERROR",
        metadata: {
          route: "/api/products/detail-page/sections/generate",
          analysisHistoryId,
          sectionId: section.id,
          reconciliation: "stale-generation-no-result",
        },
      });
    } catch {
      return currentProject;
    }
  } else if (usageRecord && usageRecord.status !== "refunded") {
    return currentProject;
  }

  return persistReconciledProject(currentProject, section.id);
}
