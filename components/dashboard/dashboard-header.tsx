import { signOut } from "@/auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ThemeSelector } from "@/components/dashboard/theme-selector";

type DashboardHeaderProps = {
  userEmail: string;
  userName: string;
};

export function DashboardHeader({ userEmail, userName }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <details className="dashboard-mobile-nav">
        <summary>菜单</summary>
        <DashboardNav variant="mobile" />
      </details>
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1>CloudAI 工作台</h1>
      </div>
      <div className="dashboard-user">
        <div className="dashboard-user-info">
          <strong>{userName}</strong>
          <span>{userEmail}</span>
        </div>
        <ThemeSelector />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit">退出</button>
        </form>
      </div>
    </header>
  );
}
