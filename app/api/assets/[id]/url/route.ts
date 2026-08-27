import { getAssetForUser } from "@/lib/assets";
import { jsonError } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/current-user";
import { getFileUrl } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AssetUrlRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: AssetUrlRouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const asset = await getAssetForUser(user.id, id);

    if (!asset) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const url = await getFileUrl(asset.url);

    return NextResponse.json(
      {
        assetId: asset.id,
        type: asset.type,
        name: asset.name,
        url,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(error, "Asset URL could not be loaded.");
  }
}
