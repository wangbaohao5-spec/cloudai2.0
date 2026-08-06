import Link from "next/link";

const quickActions = [
  {
    icon: "💬",
    title: "AI聊天",
    description: "连续讨论商品定位、平台打法、标题优化和运营建议。",
    href: "/dashboard/chat",
    buttonLabel: "开始聊天",
  },
  {
    icon: "✍",
    title: "AI文案",
    description: "生成商品标题、卖点、详情描述、短视频脚本和广告文案。",
    href: "/dashboard/copywriting",
    buttonLabel: "生成文案",
  },
  {
    icon: "◎",
    title: "AI图片",
    description: "为商品主图、场景图、详情页图片和广告海报生成视觉内容。",
    href: "/dashboard/image",
    buttonLabel: "生成图片",
  },
  {
    icon: "▶",
    title: "AI视频",
    description: "搭建短视频广告、产品展示和社交媒体视频创作流程。",
    href: "/dashboard/video",
    buttonLabel: "生成视频",
  },
];

export function QuickActions() {
  return (
    <section className="dashboard-section glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Quick Actions</p>
          <h2>快捷入口</h2>
        </div>
      </div>
      <div className="quick-action-grid">
        {quickActions.map((action) => (
          <Link className="quick-action-card" href={action.href} key={action.href}>
            <span className="quick-action-icon">{action.icon}</span>
            <h3>{action.title}</h3>
            <p>{action.description}</p>
            <strong>{action.buttonLabel}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}
