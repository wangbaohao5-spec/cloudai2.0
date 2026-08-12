"use client";

import { dashboardNavSections } from "@/components/dashboard/dashboard-nav-items";
import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardNavProps = {
  className?: string;
  variant?: "desktop" | "mobile";
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ className = "", variant = "desktop" }: DashboardNavProps) {
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
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
