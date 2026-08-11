import type { ImageEditInput, ImageEditResult } from "@/lib/ai/image-edit-provider";
import { getRequiredEnv } from "@/lib/server-env";
import sharp from "sharp";

type RunImageEditResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  b64_json?: string;
  error?: {
    message?: string;
  };
  message?: string;
};

function getRunApiUrl() {
  const baseUrl = getRequiredEnv("RUN_API_BASE_URL").replace(/\/+$/, "");

  return `${baseUrl}/v1/images/edits`;
}

function getB64Json(data: RunImageEditResponse) {
  return data.data?.[0]?.b64_json || data.b64_json || "";
}

function getNormalizedFileName(fileName?: string) {
  const baseName = (fileName || "image")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${baseName || "image"}.png`;
}

async function loadNormalizedImageBlob(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Failed to load source image for edit.");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const normalizedImage = await sharp(imageBuffer)
    .rotate()
    .flatten({ background: "#ffffff" })
    .toColorspace("srgb")
    .png()
    .toBuffer();

  return new Blob([new Uint8Array(normalizedImage)], {
    type: "image/png",
  });
}

export async function editImageWithRunApi(input: ImageEditInput): Promise<ImageEditResult> {
  const apiKey = getRequiredEnv("RUN_API_KEY");
  const model = input.model || "gpt-image-2";
  const imageBlob = await loadNormalizedImageBlob(input.imageUrl);
  const formData = new FormData();

  formData.append("model", model);
  formData.append("prompt", input.prompt);
  formData.append("response_format", "b64_json");
  formData.append("image", imageBlob, getNormalizedFileName(input.fileName));

  const response = await fetch(getRunApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });
  const data = (await response.json().catch(() => null)) as RunImageEditResponse | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Run API image edit request failed.");
  }

  const b64Json = data ? getB64Json(data) : "";

  if (!b64Json) {
    throw new Error("Run API did not return b64_json.");
  }

  return {
    b64Json,
    provider: "run-api",
    model,
  };
}
