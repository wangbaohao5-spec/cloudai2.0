import { generateVideo } from "@/lib/ai/providers/video-provider";
import { buildVideoPrompt, type VideoPromptInput } from "@/lib/ai/video-prompt-builder";
import { saveRemoteAsset } from "@/lib/asset-ingest";
import { getCurrentUser } from "@/lib/current-user";
import { jsonError, settleTask } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { BETA_VIDEO_ENABLED } from "@/lib/beta-features";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!BETA_VIDEO_ENABLED) {
      return NextResponse.json({ error: "视频工坊暂未向封闭内测开放。" }, { status: 404 });
    }

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

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "video",
      model: "dashscope-video",
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
    const historyResult = await settleTask(
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
    );
    const warnings = [storedAssetResult.error, historyResult.error].filter(Boolean);

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
