import { auth } from "@/auth";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="dashboard-shell">
      <AppSidebar />
      <div className="dashboard-main">
        <DashboardHeader userEmail={session.user.email || ""} userName={session.user.name || "CloudAI User"} />
        {children}
      </div>
    </div>
  );
}
