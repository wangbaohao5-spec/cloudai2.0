import { createAsset } from "@/lib/assets";
import type { AssetFileType } from "@/lib/storage";
import { uploadFile } from "@/lib/storage";

type SaveRemoteAssetInput = {
  userId: string;
  type: AssetFileType;
  sourceUrl: string;
  name: string;
};

function extensionFromContentType(contentType: string | null, type: AssetFileType) {
  if (contentType?.includes("png")) {
    return "png";
  }

  if (contentType?.includes("webp")) {
    return "webp";
  }

  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return "jpg";
  }

  if (contentType?.includes("mp4")) {
    return "mp4";
  }

  return type === "video" ? "mp4" : "png";
}

export async function saveRemoteAsset({ userId, type, sourceUrl, name }: SaveRemoteAssetInput) {
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`Failed to download generated ${type} asset.`);
  }

  const contentType = response.headers.get("content-type") || (type === "video" ? "video/mp4" : "image/png");
  const extension = extensionFromContentType(contentType, type);
  const fileName = `${name}.${extension}`;
  const content = await response.arrayBuffer();
  const uploadedFile = await uploadFile({
    userId,
    type,
    name: fileName,
    content,
    contentType,
  });
  const asset = await createAsset({
    userId,
    type,
    name: fileName,
    url: uploadedFile.path,
  });

  return {
    asset,
    signedUrl: uploadedFile.signedUrl,
  };
}
