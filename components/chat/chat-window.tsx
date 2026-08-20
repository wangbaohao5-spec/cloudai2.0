"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessage } from "@/components/chat/chat-message";
import type { ChatMessage as ChatMessageData } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

const initialMessages: ChatMessageData[] = [
  {
    role: "assistant",
    content: "你好，我是 CloudAI 电商助手。你可以问我商品定位、标题优化、卖点分析、短视频脚本或平台运营建议。",
  },
];

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
    const userMessage: ChatMessageData = { role: "user", content };
    const nextMessages = [...messages, userMessage];
    const apiMessages = nextMessages.filter((message) => message.content.trim());

    setMessages(nextMessages);
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("聊天请求失败，请稍后再试。");
      }

      const data = (await response.json()) as { reply: string };
      const assistantMessage: ChatMessageData = { role: "assistant", content: data.reply };

      setMessages([...nextMessages, assistantMessage]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "聊天回复失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="chat-window glass-card">
      <div className="chat-window-header">
        <div>
          <p className="eyebrow">Creative Assistant</p>
          <h2>创作助手</h2>
        </div>
        <span className="chat-status">DeepSeek</span>
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
