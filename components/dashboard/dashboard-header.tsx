import { signOut } from "@/auth";
import { ThemeSelector } from "@/components/dashboard/theme-selector";
import Link from "next/link";

type DashboardHeaderProps = {
  userEmail: string;
  userName: string;
};

const mobileNavItems = [
  { href: "/dashboard", label: "概览" },
  { href: "/dashboard/products", label: "商品工作流" },
  { href: "/dashboard/copywriting", label: "商品文案" },
  { href: "/dashboard/image", label: "AI 商品图生成" },
  { href: "/dashboard/image-edit", label: "商品原图优化" },
  { href: "/dashboard/video", label: "AI 视频生成" },
  { href: "/dashboard/chat", label: "AI 电商助手" },
  { href: "/dashboard/history", label: "历史记录" },
  { href: "/dashboard/usage", label: "用量中心" },
];

export function DashboardHeader({ userEmail, userName }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <details className="dashboard-mobile-nav">
        <summary>菜单</summary>
        <nav>
          {mobileNavItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1>CloudAI 工作台</h1>
      </div>
      <div className="dashboard-user">
        <div className="dashboard-user-info">
          <strong>{userName}</strong>
          <span>{userEmail}</span>
        </div>
        <ThemeSelector />
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
