import { generateCopywriting } from "@/lib/ai/copywriting";
import { getTextProviderModelId } from "@/lib/ai/text-router";
import { getCurrentUser } from "@/lib/current-user";
import { ApiError, jsonError } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import { sanitizeProductOutputSettings } from "@/lib/product-output-settings";
import type { CopywritingFormData } from "@/lib/types";
import { finalizeUsage, getUsageRequestId, reserveUsage } from "@/lib/usage";
import { runReservedUsageTask } from "@/lib/usage-route";
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

    const usageReservation = await reserveUsage({
      userId: user.id,
      type: "copywriting",
      model: getTextProviderModelId("copywriting", data.outputSettings),
      requestId: getUsageRequestId(request),
      metadata: { route: "/api/copywriting" },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    const persistedResult = await runReservedUsageTask({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      logLabel: "quick copywriting",
      task: async ({ setFailureCode }) => {
        const result = await generateCopywriting(data, "copywriting");
        setFailureCode("HISTORY_PERSIST_ERROR");
        const history = await saveHistory({
          userId: user.id,
          type: "copywriting",
          title: data.productName || "商品文案",
          input: data,
          output: result,
        });

        return { history, result };
      },
    });

    await finalizeUsage({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      metadata: { route: "/api/copywriting", historyId: persistedResult.history.id },
    });

    return NextResponse.json({
      ...persistedResult.result,
    });
  } catch (error) {
    return jsonError(error, "Copywriting generation failed.");
  }
}
