import { generateAIResponse } from "@/lib/ai/provider";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompts";
import type { ChatMessage } from "@/lib/types";

export async function generateChatReply(messages: ChatMessage[]) {
  const conversationMessages = messages
    .filter((message) => message.content.trim())
    .slice(-16);

  return generateAIResponse([
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...conversationMessages,
  ], { strictProviderConfig: true, task: "chat-assistant" });
}
