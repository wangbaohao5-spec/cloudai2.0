const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  "absolute-claim": ["避免最好、第一、100%、永久等绝对化表达", "可改为“突出核心卖点”", "可改为“帮助用户理解商品优势”"],
  "brand-authorization": ["仅在用户明确确认授权时使用", "可改为“图片中可见品牌标识”", "可改为“建议用户确认品牌与授权信息”"],
  certification: ["仅在有真实证明材料时使用认证、检测、专利等表述", "可改为“突出品质细节”", "可改为“展示商品工艺与材质质感”"],
  "guarantee-claim": ["避免未经确认的正品保证、假一赔十等承诺", "可改为“展示商品细节”", "可改为“强调购买前可确认售后政策”"],
  "medical-claim": ["避免治疗、治愈、医疗级、保证有效等表述", "可改为“突出温和护理感”", "可改为“展示使用体验”"],
  "official-claim": ["避免使用官方、旗舰、指定等身份关系", "可改为“品牌风格清晰”", "可改为“商品识别度较高”"],
  "sales-claim": ["仅在有真实销售数据时使用销量第一、全网第一等表述", "可改为“适合重点推荐”", "可改为“突出受欢迎的使用场景”"],
};

const FALLBACK_SUGGESTIONS = ["请确认该表述是否真实、可证明", "可改为更中性的商品描述"];

export function getRiskCategorySuggestion(category: string): string[] {
  return CATEGORY_SUGGESTIONS[category] || FALLBACK_SUGGESTIONS;
}

export function getRiskKeywordSuggestion(keyword: string, category: string): string[] {
  if (!keyword.trim()) {
    return getRiskCategorySuggestion(category);
  }

  return getRiskCategorySuggestion(category);
}
