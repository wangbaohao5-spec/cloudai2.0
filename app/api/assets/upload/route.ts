import { createAsset } from "@/lib/assets";
import { getErrorMessage, jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import type { AssetFileType } from "@/lib/storage";
import { uploadFile, validateAssetFile } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isAssetType(type: string): type is AssetFileType {
  return type === "image" || type === "video" || type === "upload";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const typeValue = String(formData.get("type") || "upload");
    const type = isAssetType(typeValue) ? typeValue : "upload";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    try {
      validateAssetFile({
        type,
        contentType: file.type,
        size: file.size,
      });
    } catch (error) {
      return NextResponse.json({ error: getErrorMessage(error, "Invalid file.") }, { status: 400 });
    }

    const uploadedFile = await uploadFile({
      userId: user.id,
      type,
      name: file.name,
      content: await file.arrayBuffer(),
      contentType: file.type || undefined,
    });
    const asset = await createAsset({
      userId: user.id,
      type,
      name: file.name,
      url: uploadedFile.path,
    });

    return NextResponse.json({
      assetId: asset.id,
      type: asset.type,
      name: asset.name,
      url: uploadedFile.signedUrl,
    });
  } catch (error) {
    return jsonError(error, "Asset upload failed.");
  }
}
