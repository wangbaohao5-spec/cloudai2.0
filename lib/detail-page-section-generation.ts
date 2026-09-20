import { ApiError } from "@/lib/api-errors";
import { db } from "@/lib/db";
import {
  DETAIL_PAGE_MODULE_DEFINITIONS,
  DETAIL_PAGE_PROJECT_HISTORY_TYPE,
  evaluateDetailPageReadiness,
  getActiveDetailPageGeneration,
  type DetailPageModuleType,
  type DetailPageProjectV2,
  type DetailPageSectionV2,
  parseDetailPageProject,
} from "@/lib/detail-page-project";
import { getDetailPageProjectRecordId } from "@/lib/detail-page-projects";
import type { Prisma } from "@prisma/client";

export const DETAIL_PAGE_GENERATABLE_MODULE_TYPES = [
  "HERO",
  "BENEFITS",
  "USAGE_SCENE",
  "PRODUCT_DETAIL",
  "BRAND_CONTENT",
] as const satisfies readonly DetailPageModuleType[];

const SAFE_GENERATION_ERROR = "视觉生成失败，请稍后重试。";

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
  const project = parseProjectRecord(record, { analysisHistoryId, userId });

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
