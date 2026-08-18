export type ProductContentRiskLevel = "none" | "low" | "medium" | "high";

export type ProductContentRiskCategory =
  | "brand-authorization"
  | "official-claim"
  | "certification"
  | "absolute-claim"
  | "medical-claim"
  | "sales-claim"
  | "guarantee-claim";

export type ProductContentRiskMatch = {
  keyword: string;
  category: ProductContentRiskCategory;
  level: ProductContentRiskLevel;
};

export type ProductContentRiskScanResult = {
  level: ProductContentRiskLevel;
  matches: ProductContentRiskMatch[];
  summary: string;
};

const LEVEL_ORDER: Record<ProductContentRiskLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const RISK_KEYWORD_DEFINITIONS = [
  { keyword: "官方授权", category: "brand-authorization", level: "high" },
  { keyword: "独家授权", category: "brand-authorization", level: "high" },
  { keyword: "品牌授权", category: "brand-authorization", level: "high" },
  { keyword: "正版授权", category: "brand-authorization", level: "high" },
  { keyword: "联名限定", category: "brand-authorization", level: "medium" },
  { keyword: "品牌联名", category: "brand-authorization", level: "medium" },
  { keyword: "官方旗舰", category: "official-claim", level: "high" },
  { keyword: "官方认证", category: "official-claim", level: "high" },
  { keyword: "正品保证", category: "guarantee-claim", level: "medium" },
  { keyword: "假一赔十", category: "guarantee-claim", level: "medium" },
  { keyword: "原厂正品", category: "guarantee-claim", level: "medium" },
  { keyword: "官方正品", category: "guarantee-claim", level: "medium" },
  { keyword: "质量保证", category: "guarantee-claim", level: "low" },
  { keyword: "绝对正品", category: "guarantee-claim", level: "medium" },
  { keyword: "国家认证", category: "certification", level: "high" },
  { keyword: "平台认证", category: "certification", level: "medium" },
  { keyword: "专利认证", category: "certification", level: "medium" },
  { keyword: "检测认证", category: "certification", level: "medium" },
  { keyword: "权威认证", category: "certification", level: "medium" },
  { keyword: "医疗认证", category: "certification", level: "high" },
  { keyword: "质检报告", category: "certification", level: "medium" },
  { keyword: "检测报告", category: "certification", level: "medium" },
  { keyword: "专利技术", category: "certification", level: "medium" },
  { keyword: "行业第一", category: "absolute-claim", level: "high" },
  { keyword: "全球领先", category: "absolute-claim", level: "medium" },
  { keyword: "零风险", category: "absolute-claim", level: "high" },
  { keyword: "100%", category: "absolute-claim", level: "high" },
  { keyword: "百分百", category: "absolute-claim", level: "high" },
  { keyword: "最好", category: "absolute-claim", level: "high" },
  { keyword: "第一", category: "absolute-claim", level: "high" },
  { keyword: "顶级", category: "absolute-claim", level: "low" },
  { keyword: "永久", category: "absolute-claim", level: "medium" },
  { keyword: "绝对", category: "absolute-claim", level: "medium" },
  { keyword: "无敌", category: "absolute-claim", level: "high" },
  { keyword: "立刻见效", category: "medical-claim", level: "high" },
  { keyword: "保证有效", category: "medical-claim", level: "high" },
  { keyword: "修复疾病", category: "medical-claim", level: "high" },
  { keyword: "医疗级", category: "medical-claim", level: "high" },
  { keyword: "抑菌率", category: "medical-claim", level: "medium" },
  { keyword: "杀菌率", category: "medical-claim", level: "medium" },
  { keyword: "治疗", category: "medical-claim", level: "high" },
  { keyword: "治愈", category: "medical-claim", level: "high" },
  { keyword: "消炎", category: "medical-claim", level: "medium" },
  { keyword: "销量第一", category: "sales-claim", level: "high" },
  { keyword: "全网第一", category: "sales-claim", level: "high" },
  { keyword: "万人推荐", category: "sales-claim", level: "low" },
  { keyword: "用户一致好评", category: "sales-claim", level: "medium" },
  { keyword: "爆款第一", category: "sales-claim", level: "high" },
] satisfies ProductContentRiskMatch[];

const RISK_KEYWORDS = [...RISK_KEYWORD_DEFINITIONS].sort((left, right) => right.keyword.length - left.keyword.length);

function getHigherRiskLevel(current: ProductContentRiskLevel, next: ProductContentRiskLevel) {
  return LEVEL_ORDER[next] > LEVEL_ORDER[current] ? next : current;
}

function hasCoveredKeyword(matches: ProductContentRiskMatch[], keyword: string) {
  return matches.some((match) => match.keyword.includes(keyword));
}

export function scanProductContentRisk(input: string): ProductContentRiskScanResult {
  try {
    const content = typeof input === "string" ? input : "";

    if (!content.trim()) {
      return {
        level: "none",
        matches: [],
        summary: "未检测到明显高风险表述。",
      };
    }

    const matches: ProductContentRiskMatch[] = [];
    let level: ProductContentRiskLevel = "none";

    for (const item of RISK_KEYWORDS) {
      if (!content.includes(item.keyword) || hasCoveredKeyword(matches, item.keyword)) {
        continue;
      }

      matches.push(item);
      level = getHigherRiskLevel(level, item.level);
    }

    return {
      level,
      matches,
      summary: matches.length ? "检测到可能需要用户确认的高风险表述。" : "未检测到明显高风险表述。",
    };
  } catch {
    return {
      level: "none",
      matches: [],
      summary: "风险扫描未完成，请人工检查生成内容。",
    };
  }
}
