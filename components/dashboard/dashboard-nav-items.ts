export type DashboardNavItem = {
  href: string;
  icon: DashboardNavIconName;
  label: string;
};

export type DashboardNavIconName =
  | "overview"
  | "productWorkspace"
  | "videoStudio"
  | "copywriting"
  | "detailPage"
  | "imageEdit"
  | "assistant"
  | "history"
  | "usage";

export type DashboardNavSection = {
  label: string;
  items: DashboardNavItem[];
};

export const dashboardNavSections: DashboardNavSection[] = [
  {
    label: "工作区",
    items: [
      { label: "概览", href: "/dashboard", icon: "overview" },
      { label: "商品工作台", href: "/dashboard/products", icon: "productWorkspace" },
      { label: "视频工坊", href: "/dashboard/video", icon: "videoStudio" },
    ],
  },
  {
    label: "AI 工具",
    items: [
      { label: "上架文案", href: "/dashboard/copywriting", icon: "copywriting" },
      { label: "详情页制作", href: "/dashboard/detail-page", icon: "detailPage" },
      { label: "商品图精修", href: "/dashboard/image-edit", icon: "imageEdit" },
      { label: "创作助手", href: "/dashboard/chat", icon: "assistant" },
    ],
  },
  {
    label: "管理",
    items: [
      { label: "历史记录", href: "/dashboard/history", icon: "history" },
      { label: "额度中心", href: "/dashboard/usage", icon: "usage" },
    ],
  },
];
