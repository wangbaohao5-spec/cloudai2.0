import type { ImageEditInput, ImageEditResult } from "@/lib/ai/image-edit-provider";
import { getRequiredEnv } from "@/lib/server-env";

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

export async function editImageWithRunApi(input: ImageEditInput): Promise<ImageEditResult> {
  const apiKey = getRequiredEnv("RUN_API_KEY");
  const model = input.model || "gpt-image-2";

  const response = await fetch(getRunApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: input.prompt,
      image_urls: input.imageUrls,
      response_format: "b64_json",
    }),
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
