export type DashboardNavItem = {
  href: string;
  label: string;
};

export type DashboardNavSection = {
  label: string;
  items: DashboardNavItem[];
};

export const dashboardNavSections: DashboardNavSection[] = [
  {
    label: "工作区",
    items: [
      { label: "概览", href: "/dashboard" },
      { label: "商品工作台", href: "/dashboard/products" },
    ],
  },
  {
    label: "AI 工具",
    items: [
      { label: "文案生成", href: "/dashboard/copywriting" },
      { label: "详情页生成", href: "/dashboard/detail-page" },
      { label: "图片优化", href: "/dashboard/image-edit" },
      { label: "视频生成", href: "/dashboard/video" },
      { label: "AI 助手", href: "/dashboard/chat" },
    ],
  },
  {
    label: "管理",
    items: [
      { label: "历史记录", href: "/dashboard/history" },
      { label: "额度中心", href: "/dashboard/usage" },
    ],
  },
];
