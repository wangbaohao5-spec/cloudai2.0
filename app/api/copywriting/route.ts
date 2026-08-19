import { generateCopywriting } from "@/lib/ai/copywriting";
import { getTextProviderModelId } from "@/lib/ai/text-router";
import { getCurrentUser } from "@/lib/current-user";
import { jsonError, settleTask } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import { sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import type { CopywritingFormData } from "@/lib/types";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CopywritingFormData;
    const data: CopywritingFormData = {
      ...body,
      outputSettings: sanitizeProductOutputSettings(body.outputSettings),
    };

    if (!data.productName?.trim()) {
      return NextResponse.json({ error: "Product name is required." }, { status: 400 });
    }

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "copywriting",
      model: getTextProviderModelId("copywriting", data.outputSettings),
    });

    const result = await generateCopywriting(data, "copywriting");
    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        type: "copywriting",
        title: data.productName || "商品文案",
        input: data,
        output: result,
      }),
    );
    const warnings = [historyResult.error].filter(Boolean);

    return NextResponse.json({
      ...result,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Copywriting generation failed.");
  }
}
