import type { ChatMessage } from "@/lib/types";

type HistoryChatDetailProps = {
  expanded: boolean;
  input: unknown;
  output: unknown;
};

type ChatHistoryInput = {
  messages?: ChatMessage[];
};

type ChatHistoryOutput = {
  reply?: string;
};

function getChatMessages(input: unknown, output: unknown) {
  const messages = input && typeof input === "object" && Array.isArray((input as ChatHistoryInput).messages) ? (input as ChatHistoryInput).messages || [] : [];
  const reply = output && typeof output === "object" && typeof (output as ChatHistoryOutput).reply === "string" ? (output as ChatHistoryOutput).reply || "" : "";

  return reply ? [...messages, { role: "assistant" as const, content: reply }] : messages;
}

function buildChatText(messages: ChatMessage[]) {
  return messages.map((message) => `${message.role === "user" ? "用户" : "AI"}：${message.content}`).join("\n\n");
}

export function HistoryChatDetail({ expanded, input, output }: HistoryChatDetailProps) {
  const messages = getChatMessages(input, output);
  const visibleMessages = expanded ? messages : messages.slice(-2);

  async function handleCopy() {
    await navigator.clipboard.writeText(buildChatText(messages));
  }

  if (!messages.length) {
    return null;
  }

  return (
    <div className="history-readable-detail">
      <div className="history-chat-log">
        {visibleMessages.map((message, index) => (
          <div className={`history-chat-message ${message.role}`} key={`${message.role}-${index}`}>
            <span>{message.role === "user" ? "用户" : "AI"}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </div>
      {!expanded && messages.length > visibleMessages.length ? <p className="muted">展开后查看完整对话。</p> : null}
      <div className="history-detail-actions">
        <button type="button" onClick={handleCopy}>
          复制对话
        </button>
      </div>
    </div>
  );
}
