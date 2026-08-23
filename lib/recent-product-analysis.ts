import { db } from "@/lib/db";
import { isProductImageAnalysis } from "@/lib/product-copywriting";

const RECENT_PRODUCT_ANALYSIS_SCAN_LIMIT = 10;

export async function getLatestValidProductAnalysisHistoryId(userId: string) {
  const records = await db.historyRecord.findMany({
    where: {
      userId,
      type: "product-analysis",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: RECENT_PRODUCT_ANALYSIS_SCAN_LIMIT,
    select: {
      id: true,
      output: true,
    },
  });

  return records.find((record) => isProductImageAnalysis(record.output))?.id || null;
}
