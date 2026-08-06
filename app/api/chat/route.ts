import { generateChatReply } from "@/lib/ai/chat";
import { getCurrentUser } from "@/lib/current-user";
import { jsonError, settleTask } from "@/lib/api-errors";
import { saveHistory } from "@/lib/history";
import type { ChatMessage } from "@/lib/types";
import { recordUsage } from "@/lib/usage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatRequestBody = {
  messages: ChatMessage[];
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ChatRequestBody;
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!messages.length) {
      return NextResponse.json({ error: "Messages are required." }, { status: 400 });
    }

    const reply = await generateChatReply(messages);
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "AI 电商助手聊天";
    const [historyResult, usageResult] = await Promise.all([
      settleTask(
        saveHistory({
          userId: user.id,
          type: "chat",
          title: lastUserMessage.length > 32 ? `${lastUserMessage.slice(0, 32)}...` : lastUserMessage,
          input: { messages },
          output: { reply },
        }),
      ),
      settleTask(
        recordUsage({
          userId: user.id,
          type: "chat",
          model: "deepseek-v4-pro",
        }),
      ),
    ]);
    const warnings = [historyResult.error, usageResult.error].filter(Boolean);

    return NextResponse.json({
      reply,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return jsonError(error, "Chat reply failed.");
  }
}
