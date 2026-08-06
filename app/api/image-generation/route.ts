import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Legacy image generation endpoint is disabled. Use /api/image/generate.",
    },
    { status: 410 },
  );
}
