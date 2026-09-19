import { deleteAssetForUser } from "@/lib/assets";
import { hasHistoryForAsset } from "@/lib/history";
import { deleteFile } from "@/lib/storage";

type GeneratedAssetCleanupInput = {
  assetId?: string;
  logLabel: string;
  storagePath?: string;
  userId: string;
};

function warnCleanupFailure(logLabel: string, stage: string, error: unknown) {
  console.warn("[generated-asset-cleanup] cleanup failed", {
    errorName: error instanceof Error ? error.name : typeof error,
    operation: logLabel,
    stage,
  });
}

export async function cleanupGeneratedAssetAfterFailure({ assetId, logLabel, storagePath, userId }: GeneratedAssetCleanupInput) {
  if (!storagePath) {
    return;
  }

  if (assetId) {
    try {
      if (await hasHistoryForAsset(userId, assetId)) {
        return;
      }
    } catch (error) {
      warnCleanupFailure(logLabel, "history-check", error);
      return;
    }

    try {
      await deleteAssetForUser(userId, assetId);
    } catch (error) {
      warnCleanupFailure(logLabel, "asset-delete", error);
      return;
    }
  }

  try {
    await deleteFile(storagePath);
  } catch (error) {
    warnCleanupFailure(logLabel, "storage-delete", error);
  }
}
