import { enhanceImage, type ImageEnhanceInput } from "@/lib/ai/image-enhance-provider";
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

    const body = (await request.json()) as ImageEnhanceInput;

    if (!body.fileName || !body.imagePreviewUrl) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const result = await enhanceImage(body);
    const [historyResult, usageResult] = await Promise.all([
      settleTask(
        saveHistory({
          userId: user.id,
          type: "image-enhance",
          title: body.fileName,
          input: {
            fileName: body.fileName,
            platform: body.platform,
            purpose: body.purpose,
            style: body.style,
          },
          output: {
            imageUrl: result.imageUrl,
            provider: result.provider,
          },
        }),
      ),
      settleTask(
        recordUsage({
          userId: user.id,
          type: "image-enhance",
          model: "mock-image-enhance",
        }),
      ),
    ]);
    const warnings = [historyResult.error, usageResult.error].filter(Boolean);

    return NextResponse.json({
      ...result,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Image enhancement failed.");
  }
}
