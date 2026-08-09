import { editImage } from "@/lib/ai/image-edit-provider";
import { jsonError, settleTask } from "@/lib/api-errors";
import { createAsset, getAssetForUser } from "@/lib/assets";
import { getCurrentUser } from "@/lib/current-user";
import { saveHistory } from "@/lib/history";
import { getFileUrl, uploadFile } from "@/lib/storage";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ImageEditRequestBody = {
  assetId?: string;
  prompt?: string;
  model?: string;
};

function sanitizeAssetName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "image-edit";
}

function decodeBase64Image(b64Json: string) {
  const [, base64Payload] = b64Json.match(/^data:image\/\w+;base64,(.+)$/) || [];

  return Buffer.from(base64Payload || b64Json, "base64");
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ImageEditRequestBody;
    const sourceAssetId = body.assetId?.trim();
    const prompt = body.prompt?.trim();
    const model = body.model?.trim() || "gpt-image-2";

    if (!sourceAssetId) {
      return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const sourceAsset = await getAssetForUser(user.id, sourceAssetId);

    if (!sourceAsset) {
      return NextResponse.json({ error: "Image asset not found." }, { status: 404 });
    }

    if (sourceAsset.type !== "image" && sourceAsset.type !== "upload") {
      return NextResponse.json({ error: "Only image assets can be edited." }, { status: 400 });
    }

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "image-enhance",
      model,
    });

    const sourceImageUrl = await getFileUrl(sourceAsset.url);
    const editedImage = await editImage({
      imageUrls: [sourceImageUrl],
      prompt,
      model,
    });
    const imageBuffer = decodeBase64Image(editedImage.b64Json);
    const fileName = `${sanitizeAssetName(sourceAsset.name)}-edit-${Date.now()}.png`;
    const uploadedFile = await uploadFile({
      userId: user.id,
      type: "image",
      name: fileName,
      content: imageBuffer,
      contentType: "image/png",
    });
    const asset = await createAsset({
      userId: user.id,
      type: "image",
      name: fileName,
      url: uploadedFile.path,
    });
    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        assetId: asset.id,
        type: "image-enhance",
        title: `${sourceAsset.name} 图片编辑`,
        input: {
          source: "run-image-edit",
          sourceAssetId,
          prompt,
          model,
        },
        output: {
          assetId: asset.id,
          provider: editedImage.provider,
          model: editedImage.model,
        },
      }),
    );
    const warnings = [historyResult.error].filter(Boolean);

    return NextResponse.json({
      imageUrl: uploadedFile.signedUrl,
      assetId: asset.id,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Image edit failed.");
  }
}
