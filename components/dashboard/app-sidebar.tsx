"use client";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SidebarCollapseButton } from "@/components/dashboard/sidebar-collapse-button";
import Link from "next/link";

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  return (
    <aside className="dashboard-sidebar" aria-label="工作台导航" data-collapsed={collapsed ? "true" : "false"}>
      <Link className="dashboard-logo" href="/dashboard" title={collapsed ? "CloudAI" : undefined}>
        <span className="logo-mark">C</span>
        <span className="dashboard-logo-text">CloudAI</span>
      </Link>
      <DashboardNav collapsed={collapsed} />
      <SidebarCollapseButton collapsed={collapsed} onToggle={onToggleCollapsed} />
    </aside>
  );
}
