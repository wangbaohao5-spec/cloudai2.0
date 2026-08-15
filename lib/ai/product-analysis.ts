import { analyzeProductImage } from "@/lib/ai/vision-provider";
import type { ProductImageAnalysis } from "@/lib/product-types";

export async function analyzeProductImageAsset(imageUrl: string, productSupplement?: string): Promise<ProductImageAnalysis> {
  return analyzeProductImage(imageUrl, productSupplement);
}
