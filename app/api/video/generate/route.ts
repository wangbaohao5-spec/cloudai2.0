import { generateVideo } from "@/lib/ai/providers/video-provider";
import { buildVideoPrompt, type VideoPromptInput } from "@/lib/ai/video-prompt-builder";
import { saveRemoteAsset } from "@/lib/asset-ingest";
import { getCurrentUser } from "@/lib/current-user";
import { jsonError, settleTask } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as VideoPromptInput;
    const productName = body.productName?.trim();
    const productDescription = body.productDescription?.trim();

    if (!productName || !productDescription) {
      return NextResponse.json({ error: "Product name and description are required." }, { status: 400 });
    }

    const prompt = buildVideoPrompt({
      productName,
      productDescription,
      platform: body.platform,
      videoType: body.videoType,
    });
    const result = await generateVideo(prompt);
    const storedAssetResult =
      result.status === "completed" && result.url
        ? await settleTask(
            saveRemoteAsset({
              userId: user.id,
              type: "video",
              sourceUrl: result.url,
              name: `${productName}-${result.id}`,
            }),
          )
        : { data: null, error: null };
    const storedAsset = storedAssetResult.data;
    const videoUrl = storedAsset?.signedUrl || result.url;
    const [historyResult, usageResult] = await Promise.all([
      settleTask(
        saveHistory({
          userId: user.id,
          assetId: storedAsset?.asset.id || null,
          type: "video",
          title: productName,
          input: {
            productName,
            productDescription,
            platform: body.platform,
            videoType: body.videoType,
          },
          output: {
            id: result.id,
            status: result.status,
            videoUrl,
            assetId: storedAsset?.asset.id,
            storagePath: storedAsset?.asset.url,
            storageError: storedAssetResult.error || undefined,
            provider: result.provider,
            prompt,
          },
        }),
      ),
      settleTask(
        recordUsage({
          userId: user.id,
          type: "video",
          model: result.provider,
        }),
      ),
    ]);
    const warnings = [storedAssetResult.error, historyResult.error, usageResult.error].filter(Boolean);

    return NextResponse.json({
      ...result,
      url: videoUrl,
      assetId: storedAsset?.asset.id,
      storagePath: storedAsset?.asset.url,
      prompt,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Video generation failed.");
  }
}
