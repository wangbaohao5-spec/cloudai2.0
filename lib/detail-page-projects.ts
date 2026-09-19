import { ApiError } from "@/lib/api-errors";
import { db } from "@/lib/db";
import {
  applyDetailPageProjectOperation,
  DETAIL_PAGE_PROJECT_HISTORY_TYPE,
  type DetailPageProjectOperation,
  type DetailPageProjectV2,
  parseDetailPageProject,
} from "@/lib/detail-page-project";
import { Prisma } from "@prisma/client";

export function getDetailPageProjectRecordId(analysisHistoryId: string) {
  return `detail-page-project-${analysisHistoryId}`;
}

export async function getDetailPageProjectForUser(userId: string, analysisHistoryId: string) {
  const record = await db.historyRecord.findFirst({
    where: {
      id: getDetailPageProjectRecordId(analysisHistoryId),
      userId,
      type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
    },
  });

  if (!record) {
    return null;
  }

  const project = parseDetailPageProject(record.output, { userId, analysisHistoryId });

  if (!project) {
    console.warn("[detail-page-project] malformed project ignored", {
      analysisHistoryId,
      historyId: record.id,
    });
  }

  return project;
}

export async function persistDetailPageProject(project: DetailPageProjectV2, productTitle: string) {
  const id = getDetailPageProjectRecordId(project.analysisHistoryId);
  const existingRecord = await db.historyRecord.findFirst({
    where: { id, userId: project.userId, type: DETAIL_PAGE_PROJECT_HISTORY_TYPE },
  });

  if (existingRecord) {
    const existingProject = parseDetailPageProject(existingRecord.output, {
      userId: project.userId,
      analysisHistoryId: project.analysisHistoryId,
    });

    if (existingProject) {
      return existingProject;
    }

    await db.historyRecord.updateMany({
      where: { id, userId: project.userId, type: DETAIL_PAGE_PROJECT_HISTORY_TYPE },
      data: {
        input: { source: "detail-page-v2", analysisHistoryId: project.analysisHistoryId },
        output: project as unknown as Prisma.InputJsonValue,
        title: `${productTitle} 详情页策划`,
      },
    });
    return project;
  }

  try {
    await db.historyRecord.create({
      data: {
        id,
        userId: project.userId,
        assetId: null,
        type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
        title: `${productTitle} 详情页策划`,
        input: { source: "detail-page-v2", analysisHistoryId: project.analysisHistoryId },
        output: project as unknown as Prisma.InputJsonValue,
      },
    });
    return project;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const concurrentProject = await getDetailPageProjectForUser(project.userId, project.analysisHistoryId);
      if (concurrentProject) {
        return concurrentProject;
      }
    }
    throw error;
  }
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function updateDetailPageProject({
  analysisHistoryId,
  expectedRevision,
  operation,
  userId,
}: {
  analysisHistoryId: string;
  expectedRevision: number;
  operation: DetailPageProjectOperation;
  userId: string;
}) {
  const id = getDetailPageProjectRecordId(analysisHistoryId);
  const record = await db.historyRecord.findFirst({
    where: { id, userId, type: DETAIL_PAGE_PROJECT_HISTORY_TYPE },
  });

  if (!record) {
    throw new ApiError("详情页策划不存在，请重新创建。", 404);
  }

  const currentProject = parseDetailPageProject(record.output, { userId, analysisHistoryId });

  if (!currentProject) {
    throw new ApiError("详情页策划数据不可用，请重新创建。", 409);
  }

  if (currentProject.revision !== expectedRevision) {
    throw new ApiError("详情页策划已在其他页面更新，请刷新后重试。", 409);
  }

  const nextProject = {
    ...applyDetailPageProjectOperation(currentProject, operation),
    revision: currentProject.revision + 1,
  };
  const result = await db.historyRecord.updateMany({
    where: {
      id,
      userId,
      type: DETAIL_PAGE_PROJECT_HISTORY_TYPE,
      output: {
        path: ["revision"],
        equals: expectedRevision,
      },
    },
    data: {
      output: nextProject as unknown as Prisma.InputJsonValue,
    },
  });

  if (!result.count) {
    throw new ApiError("详情页策划已在其他页面更新，请刷新后重试。", 409);
  }

  return nextProject;
}
