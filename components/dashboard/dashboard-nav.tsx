"use client";

import type { DashboardNavIconName } from "@/components/dashboard/dashboard-nav-items";
import { dashboardNavSections } from "@/components/dashboard/dashboard-nav-items";
import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardNavProps = {
  className?: string;
  collapsed?: boolean;
  variant?: "desktop" | "mobile";
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function DashboardNavIcon({ icon }: { icon: DashboardNavIconName }) {
  const commonProps = {
    "aria-hidden": true,
    className: "dashboard-nav-link-icon",
    fill: "none",
    height: 18,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    width: 18,
  };

  switch (icon) {
    case "overview":
      return (
        <svg {...commonProps}>
          <rect height="8" rx="2" width="8" x="3" y="3" />
          <rect height="8" rx="2" width="8" x="13" y="3" />
          <rect height="8" rx="2" width="8" x="3" y="13" />
          <rect height="8" rx="2" width="8" x="13" y="13" />
        </svg>
      );
    case "productWorkspace":
      return (
        <svg {...commonProps}>
          <path d="M6 7.5 12 4l6 3.5v7L12 18l-6-3.5z" />
          <path d="M6 7.5 12 11l6-3.5" />
          <path d="M12 11v7" />
          <path d="M4 18.5h16" />
        </svg>
      );
    case "videoStudio":
      return (
        <svg {...commonProps}>
          <rect height="12" rx="2" width="16" x="3" y="6" />
          <path d="m19 10 3-2v8l-3-2" />
          <path d="M7 6 5.5 3.5" />
          <path d="M13 6 11.5 3.5" />
        </svg>
      );
    case "copywriting":
      return (
        <svg {...commonProps}>
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      );
    case "detailPage":
      return (
        <svg {...commonProps}>
          <rect height="16" rx="2" width="16" x="4" y="4" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      );
    case "imageEdit":
      return (
        <svg {...commonProps}>
          <rect height="14" rx="2" width="16" x="3" y="5" />
          <path d="m7 15 3-3 2 2 2-3 3 4" />
          <path d="M8 9h.01" />
          <path d="m19 4 1-2 1 2 2 1-2 1-1 2-1-2-2-1z" />
        </svg>
      );
    case "assistant":
      return (
        <svg {...commonProps}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      );
    case "history":
      return (
        <svg {...commonProps}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "usage":
      return (
        <svg {...commonProps}>
          <path d="M4 19V5" />
          <path d="M9 19v-8" />
          <path d="M14 19V8" />
          <path d="M19 19v-5" />
          <path d="M3 19h18" />
        </svg>
      );
  }
}

export function DashboardNav({ className = "", collapsed = false, variant = "desktop" }: DashboardNavProps) {
  const pathname = usePathname();
  const navClassName = ["dashboard-nav", `dashboard-nav-${variant}`, className].filter(Boolean).join(" ");

  return (
    <nav className={navClassName} aria-label="工作台导航">
      {dashboardNavSections.map((section) => (
        <section className="dashboard-nav-section" key={section.label}>
          <p className="dashboard-nav-label">{section.label}</p>
          <div className="dashboard-nav-list">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={active ? "dashboard-nav-link active" : "dashboard-nav-link"}
                  href={item.href}
                  key={item.href}
                  title={collapsed ? item.label : undefined}
                >
                  <DashboardNavIcon icon={item.icon} />
                  <span className="dashboard-nav-link-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
