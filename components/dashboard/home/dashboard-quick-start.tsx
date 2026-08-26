import Link from "next/link";
import { BETA_VIDEO_ENABLED } from "@/lib/beta-features";

const quickStartItems = [
  { href: "/dashboard/products", label: "商品工作台" },
  { href: "/dashboard/image-edit", label: "商品图精修" },
  { href: "/dashboard/copywriting", label: "上架文案" },
  ...(BETA_VIDEO_ENABLED ? [{ href: "/dashboard/video", label: "视频工坊" }] : []),
  { href: "/dashboard/chat", label: "创作助手" },
];

export function DashboardQuickStart() {
  return (
    <section className="dashboard-quick-start cai-card cai-card--compact cai-card--muted">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Quick Tools</p>
          <h2>其他创作工具</h2>
        </div>
      </div>
      <div>
        {quickStartItems.map((item) => (
          <Link className="cai-button cai-button--utility" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
