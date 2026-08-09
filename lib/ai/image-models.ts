import type { UsageType } from "@/lib/usage-limits";
import type { ImageGenerationTask } from "@/lib/ai/image-task-types";

export type ImageProviderId = "dashscope";

export type ImageModelConfig = {
  id: string;
  provider: ImageProviderId;
  model: string;
  usageType: UsageType;
};

export const DEFAULT_DASHSCOPE_IMAGE_MODEL = "wanx2.1-t2i-turbo";

export const IMAGE_MODEL_ROUTES = {
  "product-main-image": {
    id: "dashscope-wanx-product-main",
    provider: "dashscope",
    model: DEFAULT_DASHSCOPE_IMAGE_MODEL,
    usageType: "image",
  },
  "product-scene-image": {
    id: "dashscope-wanx-product-scene",
    provider: "dashscope",
    model: DEFAULT_DASHSCOPE_IMAGE_MODEL,
    usageType: "image",
  },
} satisfies Record<ImageGenerationTask, ImageModelConfig>;

export function resolveImageModel(task: ImageGenerationTask) {
  return IMAGE_MODEL_ROUTES[task];
}
