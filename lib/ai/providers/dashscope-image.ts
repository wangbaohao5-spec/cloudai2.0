const DASHSCOPE_IMAGE_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
const DASHSCOPE_TASK_API_URL = "https://dashscope.aliyuncs.com/api/v1/tasks";
const DASHSCOPE_IMAGE_MODEL = "wanx2.1-t2i-turbo";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 45;

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
    task_status?: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | string;
    results?: Array<{
      url?: string;
    }>;
  };
  code?: string;
  message?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestDashScope<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const data = (await response.json()) as T;

  if (!response.ok) {
    const errorData = data as { message?: string; code?: string };
    throw new Error(errorData.message || errorData.code || "DashScope image request failed.");
  }

  return data;
}

export async function generateDashScopeImage(prompt: string) {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is not configured.");
  }

  const createTaskData = await requestDashScope<DashScopeCreateTaskResponse>(DASHSCOPE_IMAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model: DASHSCOPE_IMAGE_MODEL,
      input: {
        prompt,
      },
      parameters: {
        n: 1,
        size: "1024*1024",
      },
    }),
  });

  const taskId = createTaskData.output?.task_id;

  if (!taskId) {
    throw new Error(createTaskData.message || "DashScope did not return a task id.");
  }

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);

    const taskData = await requestDashScope<DashScopeTaskResponse>(`${DASHSCOPE_TASK_API_URL}/${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const status = taskData.output?.task_status;
    const imageUrl = taskData.output?.results?.[0]?.url;

    if (status === "SUCCEEDED" && imageUrl) {
      return {
        imageUrl,
        taskId,
      };
    }

    if (status === "FAILED") {
      throw new Error(taskData.message || "DashScope image generation failed.");
    }
  }

  throw new Error("DashScope image generation timed out.");
}
