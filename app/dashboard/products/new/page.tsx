import { ProductWorkspaceShell } from "@/components/products/product-workspace-shell";
import { getCurrentUser } from "@/lib/current-user";
import { hasProductAnalysisHistory } from "@/lib/first-product-onboarding-server";
import { redirect } from "next/navigation";

export default async function NewProductProjectPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isFirstProductUser = !(await hasProductAnalysisHistory(user.id));

  return <ProductWorkspaceShell isFirstProductUser={isFirstProductUser} mode="create" userId={user.id} />;
}
