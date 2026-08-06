import { getCurrentUser } from "@/lib/current-user";
import { jsonError } from "@/lib/api-errors";
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
    await deleteHistory(user.id, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, "History record could not be deleted.");
  }
}
