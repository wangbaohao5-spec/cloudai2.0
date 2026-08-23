import { ProductProjectCenter } from "@/components/products/product-project-center";
import { getCurrentUser } from "@/lib/current-user";
import { getProductProjectList } from "@/lib/product-projects";
import { redirect } from "next/navigation";

export default async function AllProductProjectsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const productProjects = await getProductProjectList(user.id, { limit: 30 });

  return <ProductProjectCenter result={productProjects} />;
}
