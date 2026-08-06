import { getCurrentUser } from "@/lib/current-user";
import { jsonError } from "@/lib/api-errors";
import { getUsageStats } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getUsageStats(user.id);

    return NextResponse.json(stats);
  } catch (error) {
    return jsonError(error, "Usage stats could not be loaded.");
  }
}
