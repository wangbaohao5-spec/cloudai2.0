import { generateCopywriting } from "@/lib/ai/copywriting";
import { getCurrentUser } from "@/lib/current-user";
import { jsonError, settleTask } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import type { CopywritingFormData } from "@/lib/types";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = (await request.json()) as CopywritingFormData;

    if (!data.productName?.trim()) {
      return NextResponse.json({ error: "Product name is required." }, { status: 400 });
    }

    const result = await generateCopywriting(data);
    const [historyResult, usageResult] = await Promise.all([
      settleTask(
        saveHistory({
          userId: user.id,
          type: "copywriting",
          title: data.productName || "商品文案",
          input: data,
          output: result,
        }),
      ),
      settleTask(
        recordUsage({
          userId: user.id,
          type: "copywriting",
          model: "deepseek-v4-pro",
        }),
      ),
    ]);
    const warnings = [historyResult.error, usageResult.error].filter(Boolean);

    return NextResponse.json({
      ...result,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Copywriting generation failed.");
  }
}
