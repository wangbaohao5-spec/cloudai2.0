import { createAsset } from "@/lib/assets";
import { fetchProvider, PROVIDER_TIMEOUTS, ProviderRequestError } from "@/lib/ai/provider-http";
import type { AssetFileType } from "@/lib/storage";
import { uploadFile, validateAssetFile } from "@/lib/storage";

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
  const response = await fetchProvider(sourceUrl, {}, PROVIDER_TIMEOUTS.image);

  if (!response.ok) {
    throw new ProviderRequestError("生成结果暂时无法保存，请稍后重试。", 502);
  }

  const contentType = response.headers.get("content-type") || (type === "video" ? "video/mp4" : "image/png");
  const contentLength = Number(response.headers.get("content-length") || 0);

  if (contentLength > 0) {
    validateAssetFile({
      type,
      contentType,
      size: contentLength,
    });
  }

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
