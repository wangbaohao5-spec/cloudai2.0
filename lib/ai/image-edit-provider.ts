export type ImageEditInput = {
  imageUrl: string;
  fileName?: string;
  prompt: string;
  model?: string;
};

export type ImageEditResult = {
  b64Json: string;
  provider: string;
  model: string;
};

export type ImageEditProvider = {
  editImage: (input: ImageEditInput) => Promise<ImageEditResult>;
};

export async function editImage(input: ImageEditInput) {
  const { editImageWithRunApi } = await import("@/lib/ai/providers/run-image-edit");

  return editImageWithRunApi(input);
}
