import Link from "next/link";
import { BETA_VIDEO_ENABLED } from "@/lib/beta-features";

const quickActions = [
  {
    icon: "商",
    title: "商品工作台",
    description: "上传商品图，进入单商品工作区完成商品策划、发布目标、上架文案、原图优化、商品套图和素材交付。",
    href: "/dashboard/products",
    buttonLabel: "进入工作台",
  },
  {
    icon: "页",
    title: "详情页制作",
    description: "基于已分析商品生成详情页结构和详情页图片素材。",
    href: "/dashboard/detail-page",
    buttonLabel: "制作详情页",
  },
  {
    icon: "优",
    title: "商品图精修",
    description: "优化商品原图的背景、光线、质感和展示效果。",
    href: "/dashboard/image-edit",
    buttonLabel: "精修商品图",
  },
  {
    icon: "文",
    title: "上架文案",
    description: "生成商品标题、卖点、详情描述、平台文案和短视频脚本。",
    href: "/dashboard/copywriting",
    buttonLabel: "撰写文案",
  },
  ...(BETA_VIDEO_ENABLED
    ? [{
        icon: "影",
        title: "视频工坊",
        description: "用于测试商品视频能力与素材创意，后续将扩展脚本、分镜和成片流程。",
        href: "/dashboard/video",
        buttonLabel: "进入工坊",
      }]
    : []),
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
