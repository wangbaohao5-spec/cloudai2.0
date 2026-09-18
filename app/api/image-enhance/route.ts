import { enhanceImage, type ImageEnhanceInput } from "@/lib/ai/image-enhance-provider";
import { jsonError, settleTask } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import { getCurrentInternalUser } from "@/lib/internal-route-access";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentInternalUser();

    if (!user) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const body = (await request.json()) as ImageEnhanceInput;

    if (!body.fileName || !body.imagePreviewUrl) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const result = await enhanceImage(body);
    const historyResult = await settleTask(
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
      {
        logLabel: "image-enhance-history",
        warning: "历史记录暂时无法保存。",
      },
    );
    const warnings = [historyResult.error].filter(Boolean);

    return NextResponse.json({
      ...result,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Image enhancement failed.");
  }
}
