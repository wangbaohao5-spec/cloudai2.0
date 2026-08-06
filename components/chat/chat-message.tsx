import type { ChatMessage as ChatMessageData } from "@/lib/types";

type ChatMessageProps = {
  message: ChatMessageData;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <article className={`chat-message ${isUser ? "user" : "assistant"}`}>
      <div className="chat-avatar" aria-hidden="true">
        {isUser ? "你" : "AI"}
      </div>
      <div className="chat-bubble">{message.content}</div>
    </article>
  );
}
