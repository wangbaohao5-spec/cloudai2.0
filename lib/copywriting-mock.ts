import type { CopywritingFormData, CopywritingResult } from "@/lib/types";

export function createMockCopywritingResult(data: CopywritingFormData): CopywritingResult {
  const productName = data.productName || "示例商品";
  const productType = data.productType || "示例品类";
  const sellingPoints = data.sellingPoints || "高品质、易使用、适合日常场景";

  return {
    title: `${productName} ${productType}热卖推荐｜高效体验一步到位`,
    points: [
      `围绕${productType}核心需求，突出${productName}的实用价值。`,
      `结合${sellingPoints}等卖点，帮助用户快速理解购买理由。`,
      "适合电商详情页、短视频脚本和店铺活动素材的基础文案方向。",
    ],
    description: `${productName} 是一款面向${productType}用户打造的商品，适合用于日常消费、电商促销和内容种草场景。它聚焦用户关心的使用体验、购买理由和场景价值，可作为商品详情描述的 mock 输出。`,
    shortVideoScript: `开场：还在找好用的${productType}吗？这款${productName}值得看看。卖点：${sellingPoints}。收尾：适合日常使用，也适合送礼或自用，现在就去了解一下。`,
  };
}
