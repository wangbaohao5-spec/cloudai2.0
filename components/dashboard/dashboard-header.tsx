import { signOut } from "@/auth";
import Link from "next/link";

type DashboardHeaderProps = {
  userEmail: string;
  userName: string;
};

export function DashboardHeader({ userEmail, userName }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <details className="dashboard-mobile-nav">
        <summary>菜单</summary>
        <nav>
          <Link href="/dashboard">概览</Link>
          <Link href="/dashboard/copywriting">商品文案</Link>
          <Link href="/dashboard/image">AI 图片生成</Link>
          <Link href="/dashboard/image-enhance">商品图优化</Link>
          <Link href="/dashboard/video">AI 视频生成</Link>
          <Link href="/dashboard/chat">AI 电商助手</Link>
          <Link href="/dashboard/history">历史记录</Link>
        </nav>
      </details>
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1>CloudAI 工作台</h1>
      </div>
      <div className="dashboard-user">
        <div>
          <strong>{userName}</strong>
          <span>{userEmail}</span>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit">退出</button>
        </form>
      </div>
    </header>
  );
}
