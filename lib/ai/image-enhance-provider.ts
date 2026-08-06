export type ImageEnhanceInput = {
  fileName: string;
  imagePreviewUrl: string;
  platform: string;
  purpose: string;
  style: string;
};

export type ImageEnhanceResult = {
  id: string;
  status: "success";
  imageUrl: string;
  provider: string;
};

export async function enhanceImage(input: ImageEnhanceInput): Promise<ImageEnhanceResult> {
  return {
    id: `mock-enhance-${Date.now()}`,
    status: "success",
    imageUrl: input.imagePreviewUrl,
    provider: "mock-image-enhance",
  };
}
