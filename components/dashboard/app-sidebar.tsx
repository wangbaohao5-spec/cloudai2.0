"use client";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SidebarCollapseButton } from "@/components/dashboard/sidebar-collapse-button";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  return (
    <aside className="dashboard-sidebar" aria-label="工作台导航" data-collapsed={collapsed ? "true" : "false"}>
      <Link className="dashboard-logo" href="/dashboard" title={collapsed ? BRAND.name : undefined}>
        <BrandLockup className="logo-mark" wordmarkClassName="dashboard-logo-text" />
      </Link>
      <DashboardNav collapsed={collapsed} />
      <SidebarCollapseButton collapsed={collapsed} onToggle={onToggleCollapsed} />
    </aside>
  );
}
