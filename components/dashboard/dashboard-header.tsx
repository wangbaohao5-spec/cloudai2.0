import { signOut } from "@/auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

type DashboardHeaderProps = {
  userEmail: string;
  userName: string;
};

export function DashboardHeader({ userEmail, userName }: DashboardHeaderProps) {
  const accountLabel = userEmail || userName;

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
        <span className="dashboard-user-account" title={accountLabel}>
          {accountLabel}
        </span>
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
