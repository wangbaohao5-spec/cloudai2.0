import { UsageCenter } from "@/components/usage/usage-center";
import { getCurrentUser } from "@/lib/current-user";
import { getUsageCenterData } from "@/lib/usage";
import { redirect } from "next/navigation";

export default async function UsagePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getUsageCenterData(user.id);

  return (
    <main className="dashboard-content">
      <UsageCenter data={data} />
    </main>
  );
}
