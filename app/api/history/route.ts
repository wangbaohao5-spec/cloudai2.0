import { getCurrentUser } from "@/lib/current-user";
import { jsonError } from "@/lib/api-errors";
import { clearHistory, getHistory } from "@/lib/history";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await getHistory(user.id);

    return NextResponse.json({ records });
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
