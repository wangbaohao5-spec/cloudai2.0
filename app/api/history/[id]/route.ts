import { getCurrentUser } from "@/lib/current-user";
import { ApiError, jsonError } from "@/lib/api-errors";
import { deleteHistory } from "@/lib/history";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type HistoryRecordRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: HistoryRecordRouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const deletedCount = await deleteHistory(user.id, id);

    if (!deletedCount) {
      throw new ApiError("该记录不存在或不能从历史记录中删除。", 409);
    }

    return NextResponse.json({ deletedCount, ok: true });
  } catch (error) {
    return jsonError(error, "History record could not be deleted.");
  }
}
