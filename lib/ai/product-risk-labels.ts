const RISK_CATEGORY_LABELS: Record<string, string> = {
  "absolute-claim": "绝对化宣传",
  "brand-authorization": "品牌/授权表述",
  certification: "认证/检测表述",
  "guarantee-claim": "保证承诺表述",
  "medical-claim": "医疗/功效表述",
  "official-claim": "官方身份表述",
  "sales-claim": "销量/评价表述",
};

export function getRiskCategoryLabel(category: string) {
  return RISK_CATEGORY_LABELS[category] || "需要确认的表述";
}
