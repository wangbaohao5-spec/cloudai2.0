import { db } from "@/lib/db";

export async function hasProductAnalysisHistory(userId: string) {
  const record = await db.historyRecord.findFirst({
    where: {
      userId,
      type: "product-analysis",
    },
    select: {
      id: true,
    },
  });

  return Boolean(record);
}
