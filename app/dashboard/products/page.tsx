import { ProductWorkspaceShell } from "@/components/products/product-workspace-shell";
import { getCurrentUser } from "@/lib/current-user";
import { getLatestValidProductAnalysisHistoryId } from "@/lib/recent-product-analysis";
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
  let fallbackAnalysisHistoryId: string | null = null;

  if (!analysisHistoryId) {
    const user = await getCurrentUser();

    if (!user) {
      redirect("/login");
    }

    fallbackAnalysisHistoryId = await getLatestValidProductAnalysisHistoryId(user.id);
  }

  return <ProductWorkspaceShell fallbackAnalysisHistoryId={fallbackAnalysisHistoryId} initialAnalysisHistoryId={analysisHistoryId || undefined} restoreFromRecent={!analysisHistoryId} />;
}
