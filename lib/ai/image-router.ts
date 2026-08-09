import { resolveImageModel } from "@/lib/ai/image-models";
import type { ImageGenerationTask } from "@/lib/ai/image-task-types";

export type RoutedImageInput = {
  task: ImageGenerationTask;
  prompt: string;
};

export type RoutedImageResult = {
  imageUrl: string;
  taskId?: string;
  provider: string;
  model: string;
  modelId: string;
  usageType: "image";
};

export function resolveRoutedImageModel(task: ImageGenerationTask) {
  return resolveImageModel(task);
}

export async function generateRoutedImage({ prompt, task }: RoutedImageInput): Promise<RoutedImageResult> {
  const modelRoute = resolveImageModel(task);

  if (modelRoute.provider === "dashscope") {
    const { generateDashScopeImage } = await import("@/lib/ai/providers/dashscope-image");
    const image = await generateDashScopeImage(prompt, {
      model: modelRoute.model,
    });

    return {
      ...image,
      provider: modelRoute.provider,
      model: modelRoute.model,
      modelId: modelRoute.id,
      usageType: modelRoute.usageType,
    };
  }

  throw new Error(`Unsupported image provider: ${modelRoute.provider}.`);
}
