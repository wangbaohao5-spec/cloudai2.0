import { getOptionalEnv } from "@/lib/server-env";
import type { ImageEditInput, ImageEditResult, ImageEditTask } from "@/lib/ai/image-edit-provider";

type ImageEditProviderId = "run-api";
type ImageEditRouteSource = "default" | "explicit" | "global-env" | "task-env";

type ImageEditRoute = {
  task: ImageEditTask;
  provider: ImageEditProviderId | string;
  model: string;
  modelId: string;
  providerSource: ImageEditRouteSource;
  modelSource: ImageEditRouteSource;
  outputRatio?: string;
};

const DEFAULT_IMAGE_EDIT_PROVIDER: ImageEditProviderId = "run-api";
const DEFAULT_IMAGE_EDIT_MODEL = "gpt-image-2";

const taskEnvMap: Record<ImageEditTask, { provider: Parameters<typeof getOptionalEnv>[0]; model: Parameters<typeof getOptionalEnv>[0] }> = {
  "image-edit": {
    provider: "IMAGE_EDIT_PROVIDER",
    model: "IMAGE_EDIT_MODEL",
  },
  "product-image-edit": {
    provider: "PRODUCT_IMAGE_EDIT_PROVIDER",
    model: "PRODUCT_IMAGE_EDIT_MODEL",
  },
  "product-scene-image": {
    provider: "SCENE_IMAGE_PROVIDER",
    model: "SCENE_IMAGE_MODEL",
  },
  "product-detail-page": {
    provider: "DETAIL_PAGE_IMAGE_PROVIDER",
    model: "DETAIL_PAGE_IMAGE_MODEL",
  },
  "product-image-set": {
    provider: "IMAGE_SET_IMAGE_PROVIDER",
    model: "IMAGE_SET_IMAGE_MODEL",
  },
};

function getImageEditModelId(provider: string, model: string, task: ImageEditTask) {
  return `${provider}-${model}-${task}`;
}

function logResolvedRoute(route: ImageEditRoute) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[image-edit-router] resolved model", {
    task: route.task,
    provider: route.provider,
    model: route.model,
    providerSource: route.providerSource,
    modelSource: route.modelSource,
    outputRatio: route.outputRatio,
  });
}

export function resolveImageEditRoute(
  input: Pick<ImageEditInput, "task" | "model" | "outputSettings"> = {},
  options: { log?: boolean } = {},
): ImageEditRoute {
  const task = input.task || "image-edit";
  const taskEnv = taskEnvMap[task];
  const taskProvider = getOptionalEnv(taskEnv.provider);
  const globalProvider = getOptionalEnv("IMAGE_EDIT_PROVIDER");
  const taskModel = getOptionalEnv(taskEnv.model);
  const globalModel = getOptionalEnv("IMAGE_EDIT_MODEL");
  const provider = taskProvider || globalProvider || DEFAULT_IMAGE_EDIT_PROVIDER;
  const model = input.model || taskModel || globalModel || DEFAULT_IMAGE_EDIT_MODEL;
  const providerSource: ImageEditRouteSource = taskProvider ? "task-env" : globalProvider ? "global-env" : "default";
  const modelSource: ImageEditRouteSource = input.model ? "explicit" : taskModel ? "task-env" : globalModel ? "global-env" : "default";
  const outputRatio = input.outputSettings?.outputRatio;
  const route = {
    task,
    provider,
    model,
    modelId: getImageEditModelId(provider, model, task),
    providerSource,
    modelSource,
    outputRatio,
  };

  if (options.log !== false) {
    logResolvedRoute(route);
  }

  return route;
}

export async function editImageWithRouter(input: ImageEditInput): Promise<ImageEditResult> {
  const route = resolveImageEditRoute(input);

  if (route.provider !== "run-api") {
    throw new Error(`Unsupported image edit provider: ${route.provider}`);
  }

  const { editImageWithRunApi } = await import("@/lib/ai/providers/run-image-edit");
  const result = await editImageWithRunApi({
    ...input,
    model: route.model,
  });

  return {
    ...result,
    provider: route.provider,
    model: route.model,
    modelId: route.modelId,
    providerSource: route.providerSource,
    modelSource: route.modelSource,
    outputRatio: route.outputRatio,
  };
}
