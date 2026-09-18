import { ImageEnhancePageClient } from "@/components/image-enhance/image-enhance-page-client";
import { requireInternalRouteAccess } from "@/lib/internal-route-access";

export default async function ImageEnhancePage() {
  await requireInternalRouteAccess();

  return <ImageEnhancePageClient />;
}
