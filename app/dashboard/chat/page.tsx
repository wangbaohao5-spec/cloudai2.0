import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";

export default function ChatPage() {
  return (
    <main className="dashboard-content">
      <section className="chat-shell">
        <ChatSidebar />
        <ChatWindow />
      </section>
    </main>
  );
}
