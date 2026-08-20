import Link from "next/link";

const quickActions = [
  {
    icon: "商",
    title: "商品 AI 工作流",
    description: "上传商品图，完成商品分析、发布目标、文案、图片优化、套图和素材交付。",
    href: "/dashboard/products",
    buttonLabel: "开始工作流",
  },
  {
    icon: "页",
    title: "详情页生成",
    description: "基于已分析商品生成详情页结构和详情页图片素材。",
    href: "/dashboard/detail-page",
    buttonLabel: "生成详情页",
  },
  {
    icon: "优",
    title: "图片优化",
    description: "基于商品原图生成更适合电商展示的优化图片。",
    href: "/dashboard/image-edit",
    buttonLabel: "优化图片",
  },
  {
    icon: "文",
    title: "AI 文案",
    description: "生成商品标题、卖点、详情描述、短视频脚本和广告文案。",
    href: "/dashboard/copywriting",
    buttonLabel: "生成文案",
  },
  {
    icon: "影",
    title: "AI 视频",
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
