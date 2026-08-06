import { db } from "@/lib/db";
import type { AssetFileType } from "@/lib/storage";

export type AssetInput = {
  userId: string;
  type: AssetFileType;
  url: string;
  name: string;
};

export async function createAsset(data: AssetInput) {
  return db.asset.create({
    data,
  });
}

export async function getAssetForUser(userId: string, assetId: string) {
  return db.asset.findFirst({
    where: {
      id: assetId,
      userId,
    },
  });
}

export async function deleteAssetForUser(userId: string, assetId: string) {
  return db.asset.deleteMany({
    where: {
      id: assetId,
      userId,
    },
  });
}
