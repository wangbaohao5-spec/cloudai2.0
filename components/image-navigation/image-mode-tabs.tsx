"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const imageModeTabs = [
  {
    href: "/dashboard/image",
    label: "早期商品图工具",
  },
  {
    href: "/dashboard/image-edit",
    label: "商品图精修",
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
