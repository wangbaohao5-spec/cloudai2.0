import { ProductWorkspaceShell } from "@/components/products/product-workspace-shell";

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

  return <ProductWorkspaceShell initialAnalysisHistoryId={analysisHistoryId || undefined} />;
}
