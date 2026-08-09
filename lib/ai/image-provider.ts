import type { ImageGenerationTask } from "@/lib/ai/image-task-types";
import type { RoutedImageResult } from "@/lib/ai/image-router";

export type GeneratedImage = {
  imageUrl: string;
  taskId?: string;
  provider?: string;
  model?: string;
  modelId?: string;
  usageType?: "image";
};

export type ImageProvider = {
  generateImage: (prompt: string) => Promise<GeneratedImage>;
};

export type GenerateImageInput = {
  task: ImageGenerationTask;
  prompt: string;
};

export function generateImage(input: string): Promise<GeneratedImage>;
export function generateImage(input: GenerateImageInput): Promise<RoutedImageResult>;
export async function generateImage(input: string | GenerateImageInput) {
  if (typeof input === "string") {
    const { generateDashScopeImage } = await import("@/lib/ai/providers/dashscope-image");

    return generateDashScopeImage(input);
  }

  const { generateRoutedImage } = await import("@/lib/ai/image-router");

  return generateRoutedImage(input);
}
