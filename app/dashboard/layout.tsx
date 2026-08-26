import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardShellClient } from "@/components/dashboard/dashboard-shell-client";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShellClient
      header={<DashboardHeader userEmail={user.email} userName={user.name || "CloudAI User"} />}
    >
      {children}
    </DashboardShellClient>
  );
}
