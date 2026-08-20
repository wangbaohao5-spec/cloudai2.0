import Link from "next/link";

const quickStartItems = [
  { href: "/dashboard/products", label: "上传新商品" },
  { href: "/dashboard/detail-page", label: "详情页制作" },
  { href: "/dashboard/history", label: "查看历史" },
  { href: "/dashboard/chat", label: "创作助手" },
  { href: "/dashboard/image-edit", label: "商品图精修" },
  { href: "/dashboard/usage", label: "额度中心" },
];

export function DashboardQuickStart() {
  return (
    <section className="dashboard-quick-start glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">快速开始</p>
          <h2>下一步</h2>
        </div>
      </div>
      <div>
        {quickStartItems.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
