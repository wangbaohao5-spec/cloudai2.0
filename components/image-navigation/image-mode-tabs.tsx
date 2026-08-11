"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const imageModeTabs = [
  {
    href: "/dashboard/image",
    label: "AI 图片生成",
  },
  {
    href: "/dashboard/image-enhance",
    label: "商品图优化",
  },
  {
    href: "/dashboard/image-edit",
    label: "商品图片优化",
  },
];

export function ImageModeTabs() {
  const pathname = usePathname();

  return (
    <div className="image-mode-tabs">
      {imageModeTabs.map((tab) => (
        <Link className={pathname === tab.href ? "active" : undefined} href={tab.href} key={tab.href}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
