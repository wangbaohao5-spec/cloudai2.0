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

async function loadImageBlob(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("Failed to load source image for edit.");
  }

  return response.blob();
}

export async function editImageWithRunApi(input: ImageEditInput): Promise<ImageEditResult> {
  const apiKey = getRequiredEnv("RUN_API_KEY");
  const model = input.model || "gpt-image-2";
  const imageBlob = await loadImageBlob(input.imageUrl);
  const formData = new FormData();

  formData.append("model", model);
  formData.append("prompt", input.prompt);
  formData.append("response_format", "b64_json");
  formData.append("image", imageBlob, input.fileName || "image.png");

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
