export type PlatformAnnouncement = {
  date: string;
  description: string;
  id: string;
  title: string;
};

export const PLATFORM_ANNOUNCEMENTS: PlatformAnnouncement[] = [
  {
    id: "business-light",
    title: "Business Light 主题已加入",
    description: "CloudAI 工作台现支持商务浅色模式，适合长时间商品内容创作。",
    date: "2026-08",
  },
];
