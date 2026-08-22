import { ProductProjectCenter } from "@/components/products/product-project-center";
import { ProductWorkspaceShell } from "@/components/products/product-workspace-shell";
import { getCurrentUser } from "@/lib/current-user";
import { getProductProjectList } from "@/lib/product-projects";
import { redirect } from "next/navigation";

type ProductsPageProps = {
  searchParams?: Promise<{
    analysis?: string | string[];
  }>;
};

function getSearchParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const analysisHistoryId = getSearchParamValue(params?.analysis).trim();

  if (analysisHistoryId) {
    return <ProductWorkspaceShell />;
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const productProjects = await getProductProjectList(user.id, { limit: 30 });

  return <ProductProjectCenter result={productProjects} />;
}
