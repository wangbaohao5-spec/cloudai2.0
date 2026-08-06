import Link from "next/link";

const dashboardNavItems = [
  { href: "/dashboard", label: "概览" },
  { href: "/dashboard/copywriting", label: "商品文案" },
  { href: "/dashboard/image", label: "AI 图片生成" },
  { href: "/dashboard/image-enhance", label: "商品图优化" },
  { href: "/dashboard/video", label: "AI 视频生成" },
  { href: "/dashboard/chat", label: "AI 电商助手" },
  { href: "/dashboard/history", label: "历史记录" },
];

export function AppSidebar() {
  return (
    <aside className="dashboard-sidebar" aria-label="工作台导航">
      <Link className="dashboard-logo" href="/">
        <span className="logo-mark">C</span>
        <span>CloudAI</span>
      </Link>
      <nav className="dashboard-nav">
        {dashboardNavItems.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
