import { jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { getDetailPageAssetCandidates } from "@/lib/detail-page-assets";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analysisHistoryId = new URL(request.url).searchParams.get("analysisHistoryId")?.trim();

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    const candidates = await getDetailPageAssetCandidates(user.id, analysisHistoryId);

    return NextResponse.json(
      { candidates },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(error, "Detail page assets could not be loaded.");
  }
}
