import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import Link from "next/link";

export function AppSidebar() {
  return (
    <aside className="dashboard-sidebar" aria-label="工作台导航">
      <Link className="dashboard-logo" href="/dashboard">
        <span className="logo-mark">C</span>
        <span>CloudAI</span>
      </Link>
      <DashboardNav />
    </aside>
  );
}
