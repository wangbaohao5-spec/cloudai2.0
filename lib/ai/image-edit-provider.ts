import type { ProductOutputSettings } from "@/lib/product-types";

export type ImageEditTask =
  | "image-edit"
  | "product-image-edit"
  | "product-scene-image"
  | "product-detail-page"
  | "product-image-set";

export type ImageEditInput = {
  task?: ImageEditTask;
  imageUrl: string;
  fileName?: string;
  prompt: string;
  model?: string;
  outputSettings?: ProductOutputSettings | null;
};

export type ImageEditResult = {
  b64Json: string;
  provider: string;
  model: string;
  modelId?: string;
  providerSource?: string;
  modelSource?: string;
  outputRatio?: string;
};

export type ImageEditProvider = {
  editImage: (input: ImageEditInput) => Promise<ImageEditResult>;
};

export async function editImage(input: ImageEditInput) {
  const { editImageWithRouter } = await import("@/lib/ai/image-edit-router");

  return editImageWithRouter(input);
}
