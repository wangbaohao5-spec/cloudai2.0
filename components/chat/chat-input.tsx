import { FormEvent, useState } from "react";

const quickQuestions = [
  "帮我优化商品标题",
  "分析这个商品卖点",
  "写一个 TikTok 短视频脚本",
  "给我一个运营建议",
];

type ChatInputProps = {
  disabled: boolean;
  onSend: (message: string) => void;
};

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");

  function submitMessage(message: string) {
    const nextMessage = message.trim();

    if (!nextMessage || disabled) {
      return;
    }

    onSend(nextMessage);
    setValue("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage(value);
  }

  return (
    <div className="chat-input-area">
      <div className="chat-quick-actions">
        {quickQuestions.map((question) => (
          <button key={question} disabled={disabled} type="button" onClick={() => submitMessage(question)}>
            {question}
          </button>
        ))}
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          disabled={disabled}
          name="message"
          onChange={(event) => setValue(event.target.value)}
          placeholder="输入电商运营、标题、卖点或短视频脚本问题"
          rows={3}
          value={value}
        />
        <button className="button primary" disabled={disabled} type="submit">
          发送
        </button>
      </form>
    </div>
  );
}
