import { generateChatReply } from "@/lib/ai/chat";
import { getTextProviderModelId, getTextProviderName } from "@/lib/ai/text-router";
import { getCurrentUser } from "@/lib/current-user";
import { settleTask } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import type { ChatMessage } from "@/lib/types";
import { enforceUsageLimitAndRecord } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatRequestBody = {
  messages: ChatMessage[];
};

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

function getChatErrorStatus(message: string) {
  if (message.includes("消息不能为空")) {
    return 400;
  }

  if (/429|rate limit|too many requests|quota/i.test(message)) {
    return 429;
  }

  return 500;
}

function getChatErrorMessage(message: string) {
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
  model,
  provider,
  status,
}: {
  error: unknown;
  model: string;
  provider: string;
  status: number;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[chat-route] failed", {
    errorMessage: getSafeErrorMessage(error),
    errorName: error instanceof Error ? error.name : undefined,
    model,
    provider,
    route: "/api/chat",
    status,
  });
}

export async function POST(request: Request) {
  const provider = getTextProviderName();
  const model = getTextProviderModelId();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ChatRequestBody;
    const messages = normalizeChatMessages(Array.isArray(body.messages) ? body.messages : []);

    if (!messages.some((message) => message.role === "user")) {
      return NextResponse.json({ error: "消息不能为空。" }, { status: 400 });
    }

    await enforceUsageLimitAndRecord({
      userId: user.id,
      type: "chat",
      model,
    });

    const reply = await generateChatReply(messages);

    if (!reply.trim()) {
      throw new Error("创作助手服务没有返回有效回复。");
    }

    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "AI 电商助手聊天";
    const historyResult = await settleTask(
      saveHistory({
        userId: user.id,
        type: "chat",
        title: lastUserMessage.length > 32 ? `${lastUserMessage.slice(0, 32)}...` : lastUserMessage,
        input: { messages },
        output: { reply },
      }),
    );
    const warnings = [historyResult.error].filter(Boolean);

    return NextResponse.json({
      content: reply,
      model,
      provider,
      reply,
      result: reply,
      text: reply,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    const safeMessage = getSafeErrorMessage(error);
    const status = getChatErrorStatus(safeMessage);

    logChatRouteError({ error, model, provider, status });

    return NextResponse.json(
      {
        error: getChatErrorMessage(safeMessage),
        debug: process.env.NODE_ENV === "development" ? safeMessage : undefined,
      },
      { status },
    );
  }
}
