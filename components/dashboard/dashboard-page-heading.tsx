"use client";

import { usePathname } from "next/navigation";

const pageHeadings = [
  { path: "/dashboard/products/new", title: "创建商品" },
  { path: "/dashboard/products/all", title: "全部商品" },
  { path: "/dashboard/products", title: "商品工作台" },
  { path: "/dashboard/detail-page", title: "详情页制作" },
  { path: "/dashboard/generation-qa", title: "生成质量" },
  { path: "/dashboard/image-enhance", title: "原图优化" },
  { path: "/dashboard/image-edit", title: "商品图精修" },
  { path: "/dashboard/model-lab", title: "模型实验室" },
  { path: "/dashboard/copywriting", title: "上架文案" },
  { path: "/dashboard/subscription", title: "订阅" },
  { path: "/dashboard/history", title: "历史记录" },
  { path: "/dashboard/support", title: "反馈与支持" },
  { path: "/dashboard/account", title: "个人中心" },
  { path: "/dashboard/usage", title: "额度中心" },
  { path: "/dashboard/settings", title: "设置" },
  { path: "/dashboard/image", title: "商品图片" },
  { path: "/dashboard/chat", title: "创作助手" },
  { path: "/dashboard/video", title: "视频工坊" },
] as const;

export function DashboardPageHeading() {
  const pathname = usePathname();
  const heading = pageHeadings.find(({ path }) => pathname.startsWith(path));
  const isOverview = pathname === "/dashboard";

  return (
    <div className="dashboard-page-heading">
      <h1>{isOverview ? "工作台概览" : heading?.title || "Vahoro 工作台"}</h1>
      {isOverview ? <p>继续当前商品，查看最近创作与素材。</p> : null}
    </div>
  );
}
