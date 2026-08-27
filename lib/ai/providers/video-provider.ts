import type { VideoGenerationResult } from "@/lib/ai/types";
import { getOptionalEnv, getRequiredEnv } from "@/lib/server-env";
import { fetchProvider, PROVIDER_TIMEOUTS, ProviderRequestError } from "@/lib/ai/provider-http";

const DASHSCOPE_VIDEO_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
const DASHSCOPE_TASK_API_URL = "https://dashscope.aliyuncs.com/api/v1/tasks";
const DASHSCOPE_VIDEO_MODEL = getOptionalEnv("DASHSCOPE_VIDEO_MODEL") || "wan2.6-t2v";
const POLL_INTERVAL_MS = 15000;
const MAX_POLL_ATTEMPTS = 12;
const MOCK_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

type DashScopeCreateTaskResponse = {
  output?: {
    task_id?: string;
    task_status?: string;
  };
  code?: string;
  message?: string;
};

type DashScopeTaskResponse = {
  output?: {
    task_id?: string;
    task_status?: "PENDING" | "PRE-PROCESSING" | "RUNNING" | "POST-PROCESSING" | "SUCCEEDED" | "FAILED" | "UNKNOWN" | string;
    video_url?: string;
    output_video_url?: string;
    results?: Array<{
      url?: string;
      video_url?: string;
      output_video_url?: string;
    }>;
  };
  code?: string;
  message?: string;
};

export type VideoProvider = {
  generateVideo: (prompt: string) => Promise<VideoGenerationResult>;
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function mapDashScopeStatus(status?: string): VideoGenerationResult["status"] {
  if (status === "SUCCEEDED") {
    return "completed";
  }

  if (status === "FAILED" || status === "UNKNOWN") {
    return "failed";
  }

  if (status === "PENDING") {
    return "pending";
  }

  return "processing";
}

function getVideoUrl(output?: DashScopeTaskResponse["output"]) {
  return (
    output?.video_url ||
    output?.output_video_url ||
    output?.results?.[0]?.video_url ||
    output?.results?.[0]?.output_video_url ||
    output?.results?.[0]?.url
  );
}

async function requestDashScope<T>(url: string, init: RequestInit) {
  const response = await fetchProvider(url, init, PROVIDER_TIMEOUTS.video);
  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new ProviderRequestError("视频生成服务暂时不可用，请稍后重试。", 502);
  }

  return data;
}

function createMockFallbackVideo(): VideoGenerationResult {
  return {
    id: `mock-video-${Date.now()}`,
    status: "completed",
    url: MOCK_VIDEO_URL,
    provider: "mock-fallback",
  };
}

async function generateDashScopeVideo(prompt: string): Promise<VideoGenerationResult> {
  const apiKey = getRequiredEnv("DASHSCOPE_API_KEY");

  const createTaskData = await requestDashScope<DashScopeCreateTaskResponse>(DASHSCOPE_VIDEO_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model: DASHSCOPE_VIDEO_MODEL,
      input: {
        prompt,
      },
      parameters: {
        size: "1280*720",
        prompt_extend: true,
        watermark: true,
        duration: 5,
      },
    }),
  });

  const taskId = createTaskData.output?.task_id;

  if (!taskId) {
    throw new Error(createTaskData.message || "DashScope did not return a video task id.");
  }

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);

    const taskData = await requestDashScope<DashScopeTaskResponse>(`${DASHSCOPE_TASK_API_URL}/${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const status = mapDashScopeStatus(taskData.output?.task_status);
    const url = getVideoUrl(taskData.output);

    if (status === "completed") {
      return {
        id: taskId,
        status,
        url,
        provider: `dashscope:${DASHSCOPE_VIDEO_MODEL}`,
      };
    }

    if (status === "failed") {
      return {
        id: taskId,
        status,
        provider: `dashscope:${DASHSCOPE_VIDEO_MODEL}`,
      };
    }
  }

  return {
    id: taskId,
    status: "processing",
    provider: `dashscope:${DASHSCOPE_VIDEO_MODEL}`,
  };
}

export async function generateVideo(prompt: string): Promise<VideoGenerationResult> {
  try {
    return await generateDashScopeVideo(prompt);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    return createMockFallbackVideo();
  }
}
