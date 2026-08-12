import { DashboardHomeShell } from "@/components/dashboard/home/dashboard-home-shell";
import { getCurrentUser } from "@/lib/current-user";
import { getDashboardHomeData } from "@/lib/dashboard-home";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const dashboardHomeData = await getDashboardHomeData(user.id);

  return <DashboardHomeShell data={dashboardHomeData} />;
}
