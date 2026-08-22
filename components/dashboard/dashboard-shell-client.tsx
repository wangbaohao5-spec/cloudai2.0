"use client";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "cloudai-sidebar-collapsed";

type DashboardShellClientProps = {
  children: ReactNode;
  header: ReactNode;
};

export function DashboardShellClient({ children, header }: DashboardShellClientProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    } catch {
      setCollapsed(false);
    }
  }, []);

  function handleToggleSidebar() {
    setCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore storage failures so navigation remains usable.
      }

      return next;
    });
  }

  return (
    <div className="dashboard-shell" data-sidebar-collapsed={collapsed ? "true" : "false"}>
      <AppSidebar collapsed={collapsed} onToggleCollapsed={handleToggleSidebar} />
      <div className="dashboard-main">
        {header}
        {children}
      </div>
    </div>
  );
}
