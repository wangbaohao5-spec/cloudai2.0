import { auth } from "@/auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardShellClient } from "@/components/dashboard/dashboard-shell-client";
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
    <DashboardShellClient
      header={<DashboardHeader userEmail={session.user.email || ""} userName={session.user.name || "CloudAI User"} />}
    >
      {children}
    </DashboardShellClient>
  );
}
