import { generateChatReply } from "@/lib/ai/chat";
import { getTextProviderResolution, TextProviderError } from "@/lib/ai/text-router";
import { getCurrentUser } from "@/lib/current-user";
import { ApiError } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import type { ChatMessage } from "@/lib/types";
import { finalizeUsage, getUsageRequestId, reserveUsage } from "@/lib/usage";
import { runReservedUsageTask } from "@/lib/usage-route";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatRequestBody = {
  messages: ChatMessage[];
};

const CHAT_TEXT_TASK = "chat-assistant";

function normalizeChatMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => ["assistant", "user"].includes(message.role) && typeof message.content === "string" && message.content.trim())
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));
}

function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getChatErrorStatus(error: unknown, message: string) {
  if (error instanceof ApiError) {
    return error.status;
  }

  if (error instanceof TextProviderError) {
    if (error.kind === "configuration") {
      return 500;
    }

    if (error.kind === "auth") {
      return error.status || 401;
    }

    if (error.kind === "model-not-found") {
      return 404;
    }

    if (error.kind === "rate-limit") {
      return 429;
    }

    if (error.kind === "network" || error.kind === "server") {
      return 502;
    }
  }

  if (message.includes("消息不能为空")) {
    return 400;
  }

  if (/429|rate limit|too many requests|quota/i.test(message)) {
    return 429;
  }

  return 500;
}

function getChatErrorMessage(error: unknown, message: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof TextProviderError) {
    if (error.kind === "configuration") {
      return "创作助手文本模型未配置，请检查环境变量。";
    }

    if (error.kind === "auth") {
      return "创作助手模型鉴权失败，请检查 API Key。";
    }

    if (error.kind === "model-not-found") {
      return "创作助手模型不可用，请检查模型名称。";
    }

    if (error.kind === "rate-limit") {
      return "模型服务请求过于频繁，请稍后重试。";
    }

    if (error.kind === "server" || error.kind === "network") {
      return "创作助手模型服务暂时不可用，请稍后重试。";
    }
  }

  if (message.includes("消息不能为空")) {
    return "消息不能为空。";
  }

  if (/Missing required server environment variable|not fully configured|未配置|environment variable/i.test(message)) {
    return "文本模型服务未配置，请检查环境变量。";
  }

  if (/429|rate limit|too many requests|quota/i.test(message)) {
    return "模型服务繁忙，请稍后再试。";
  }

  if (/fetch failed|network|timeout|ECONN|ENOTFOUND|ETIMEDOUT|暂时不可用|502|503|504/i.test(message)) {
    return "创作助手服务暂时不可用，请稍后重试。";
  }

  return "创作助手服务暂时不可用，请稍后重试。";
}

function logChatRouteError({
  error,
  hasApiKey,
  baseUrlHost,
  modelSource,
  model,
  provider,
  providerSource,
  status,
}: {
  baseUrlHost?: string;
  error: unknown;
  hasApiKey?: boolean;
  model: string;
  modelSource?: string;
  provider: string;
  providerSource?: string;
  status: number;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[chat-route] failed", {
    errorMessage: getSafeErrorMessage(error),
    errorName: error instanceof Error ? error.name : undefined,
    errorKind: error instanceof TextProviderError ? error.kind : undefined,
    hasApiKey,
    baseUrlHost,
    model,
    modelSource,
    provider,
    providerSource,
    route: "/api/chat",
    status,
    upstreamCode: error instanceof TextProviderError ? error.upstreamCode : undefined,
    upstreamMessage: error instanceof TextProviderError ? error.upstreamMessage : undefined,
    upstreamStatus: error instanceof TextProviderError ? error.upstreamStatus : undefined,
    upstreamHttpStatus: error instanceof TextProviderError ? error.status : undefined,
  });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolution = getTextProviderResolution(CHAT_TEXT_TASK, null, { strictProviderConfig: true });

    if (process.env.NODE_ENV === "development") {
      console.info("[chat] provider resolved", {
        baseUrlHost: resolution.baseUrlHost,
        hasApiKey: resolution.hasApiKey,
        model: resolution.model,
        modelSource: resolution.modelSource,
        provider: resolution.provider,
        providerSource: resolution.providerSource,
        task: CHAT_TEXT_TASK,
      });
    }

    const body = (await request.json()) as ChatRequestBody;
    const messages = normalizeChatMessages(Array.isArray(body.messages) ? body.messages : []);

    if (!messages.some((message) => message.role === "user")) {
      return NextResponse.json({ error: "消息不能为空。" }, { status: 400 });
    }

    const usageReservation = await reserveUsage({
      userId: user.id,
      type: "chat",
      model: resolution.modelId,
      requestId: getUsageRequestId(request),
      metadata: { route: "/api/chat" },
    });

    if (!usageReservation.created) {
      throw new ApiError("This generation request has already been reserved.", 409);
    }

    const persistedResult = await runReservedUsageTask({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      logLabel: "chat",
      task: async ({ setFailureCode }) => {
        const reply = await generateChatReply(messages);

        if (!reply.trim()) {
          setFailureCode("INVALID_PROVIDER_OUTPUT");
          throw new Error("创作助手服务没有返回有效回复。");
        }

        const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "AI 电商助手聊天";
        setFailureCode("HISTORY_PERSIST_ERROR");
        const history = await saveHistory({
          userId: user.id,
          type: "chat",
          title: lastUserMessage.length > 32 ? `${lastUserMessage.slice(0, 32)}...` : lastUserMessage,
          input: { messages },
          output: { model: resolution.modelId, provider: resolution.provider, reply },
        });

        return { history, reply };
      },
    });

    await finalizeUsage({
      usageRecordId: usageReservation.record.id,
      userId: user.id,
      metadata: { route: "/api/chat", historyId: persistedResult.history.id },
    });

    return NextResponse.json({
      content: persistedResult.reply,
      model: resolution.modelId,
      provider: resolution.provider,
      reply: persistedResult.reply,
      result: persistedResult.reply,
      text: persistedResult.reply,
    });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    const status = getChatErrorStatus(error, safeMessage);
    let resolution: ReturnType<typeof getTextProviderResolution> | null = null;

    try {
      resolution = getTextProviderResolution(CHAT_TEXT_TASK);
    } catch {
      resolution = null;
    }

    logChatRouteError({
      baseUrlHost: resolution?.baseUrlHost,
      error,
      hasApiKey: resolution?.hasApiKey,
      model: resolution?.modelId || (error instanceof TextProviderError ? error.model || "unknown" : "unknown"),
      modelSource: resolution?.modelSource,
      provider: resolution?.provider || (error instanceof TextProviderError ? error.provider || "unknown" : "unknown"),
      providerSource: resolution?.providerSource,
      status,
    });

    return NextResponse.json(
      {
        error: getChatErrorMessage(error, safeMessage),
        message: getChatErrorMessage(error, safeMessage),
        debug: process.env.NODE_ENV === "development" ? safeMessage : undefined,
      },
      { status, headers: error instanceof ApiError ? error.headers : undefined },
    );
  }
}
