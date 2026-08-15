import type { ProductImageAnalysis } from "@/lib/product-types";

export type VisionProvider = {
  analyzeProductImage: (imageUrl: string, productHint?: string) => Promise<ProductImageAnalysis>;
};

export async function analyzeProductImage(imageUrl: string, productHint?: string) {
  const { analyzeDashScopeProductImage } = await import("@/lib/ai/providers/dashscope-vision");

  return analyzeDashScopeProductImage(imageUrl, productHint);
}
