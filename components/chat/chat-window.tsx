"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import { createGenerationAttempt } from "@/lib/generation-request";
import type { ChatMessage as ChatMessageData } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

const initialMessages: ChatMessageData[] = [
  {
    role: "assistant",
    content: "你好，我是 CloudAI 创作助手。你可以问我商品卖点、平台风格、素材策略、主图点击力或上架内容优化。",
  },
];

type ChatApiResponse = {
  content?: string;
  debug?: string;
  error?: string;
  message?: string;
  reply?: string;
  result?: string;
  text?: string;
};

async function readChatApiResponse(response: Response) {
  return response.json().catch(() => null) as Promise<ChatApiResponse | null>;
}

function getAssistantContent(data: ChatApiResponse | null) {
  return data?.content || data?.text || data?.result || data?.reply || "";
}

function getChatErrorMessage(data: ChatApiResponse | null) {
  return data?.error || data?.message || "创作助手服务暂时不可用，请稍后重试。";
}

export function ChatWindow() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  async function handleSend(content: string) {
    const nextContent = content.trim();

    if (!nextContent) {
      setError("消息不能为空。");
      return;
    }

    const userMessage: ChatMessageData = { role: "user", content: nextContent };
    const nextMessages = [...messages, userMessage];
    const apiMessages = nextMessages.filter((message) => message.content.trim());

    setMessages(nextMessages);
    setError("");
    setIsLoading(true);

    try {
      const generationAttempt = createGenerationAttempt();
      const response = await generationAttempt.fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });

      const data = await readChatApiResponse(response);

      if (!response.ok) {
        if (process.env.NODE_ENV === "development") {
          console.info("[chat-window] request failed", {
            message: data?.error || data?.message,
            responseKeys: data ? Object.keys(data) : [],
            status: response.status,
          });
        }

        throw new Error(getChatErrorMessage(data));
      }

      const assistantContent = getAssistantContent(data);

      if (!assistantContent.trim()) {
        throw new Error("创作助手服务没有返回有效回复，请稍后重试。");
      }

      const assistantMessage: ChatMessageData = { role: "assistant", content: assistantContent };

      setMessages([...nextMessages, assistantMessage]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "聊天回复失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="chat-window cai-card cai-card--compact">
      <div className="chat-window-header">
        <div>
          <p className="eyebrow">Commerce Assistant</p>
          <h2>创作助手</h2>
          <p>快速梳理商品卖点、平台表达、素材方向和内容创作思路。</p>
        </div>
        <span className="chat-status cai-badge cai-badge--neutral">文本助手</span>
      </div>
      <div className="chat-messages" ref={messagesRef} aria-live="polite">
        {messages.map((message, index) => (
          <ChatMessage key={`${message.role}-${index}-${message.content}`} message={message} />
        ))}
        {isLoading ? (
          <article className="chat-message assistant">
            <div className="chat-avatar" aria-hidden="true">
              AI
            </div>
            <div className="chat-bubble">CloudAI 正在思考...</div>
          </article>
        ) : null}
      </div>
      {error ? <p className="chat-error">{error}</p> : null}
      <ChatInput disabled={isLoading} onSend={handleSend} />
    </section>
  );
}
