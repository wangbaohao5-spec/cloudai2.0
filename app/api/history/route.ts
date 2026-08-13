import { getCurrentUser } from "@/lib/current-user";
import { jsonError } from "@/lib/api-errors";
import { clearHistory, getHistoryPage } from "@/lib/history";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const HISTORY_PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor")?.trim() || null;
    const page = await getHistoryPage(user.id, HISTORY_PAGE_SIZE, cursor);

    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error, "History records could not be loaded.");
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await clearHistory(user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, "History records could not be cleared.");
  }
}
