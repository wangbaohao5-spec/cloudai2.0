import { jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { getProductCreationCenterData } from "@/lib/product-creation-center";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisHistoryId = searchParams.get("id")?.trim();

    if (!analysisHistoryId) {
      return NextResponse.json({ error: "Analysis history id is required." }, { status: 400 });
    }

    const data = await getProductCreationCenterData(user.id, analysisHistoryId);

    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error, "Product creation center could not be loaded.");
  }
}
