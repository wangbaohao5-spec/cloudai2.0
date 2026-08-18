"use client";

import { getRiskCategoryLabel } from "@/lib/ai/product-risk-labels";
import { getRiskCategorySuggestion } from "@/lib/ai/product-risk-suggestion";
import { useState } from "react";

type RiskLevel = "none" | "low" | "medium" | "high";

type ProductRiskScanAlertProps = {
  onOpenRiskConfirmations?: () => void;
  riskScan?: {
    level: RiskLevel;
    matches?: Array<{
      category: string;
      keyword: string;
      level: string;
    }>;
    summary?: string;
  } | null;
  showAction?: boolean;
};

const LEVEL_LABELS: Record<Exclude<RiskLevel, "none">, string> = {
  high: "高风险提示",
  low: "轻提示",
  medium: "注意",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "absolute-claim": "涉及最好、第一、100%、永久等表达，建议改为更稳妥的描述。",
  "brand-authorization": "涉及品牌授权、联名、官方关系等内容，建议仅在真实可证明时使用。",
  certification: "涉及认证、检测、专利、报告等内容，建议有真实证明材料再使用。",
  "guarantee-claim": "涉及正品保证、质量保证、假一赔十等承诺，建议确认售后和资质后使用。",
  "medical-claim": "涉及治疗、治愈、医疗级、保证有效等表达，建议谨慎使用。",
  "official-claim": "涉及官方、旗舰、指定等身份关系，建议确认后再使用。",
  "sales-claim": "涉及销量第一、万人推荐、用户一致好评等表达，建议有真实数据再使用。",
};

const CATEGORY_KEYWORD_LIMIT = 6;

function getRiskCategoryDescription(category: string) {
  return CATEGORY_DESCRIPTIONS[category] || "这类表述建议人工确认真实性和可证明性后再使用。";
}

function scrollToRiskConfirmations() {
  document.getElementById("product-risk-confirmations")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ProductRiskScanAlert({ onOpenRiskConfirmations, riskScan, showAction = true }: ProductRiskScanAlertProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (!riskScan || riskScan.level === "none") {
    return null;
  }

  const matches = Array.isArray(riskScan.matches) ? riskScan.matches.filter((match) => match.keyword?.trim()) : [];
  const level = riskScan.level === "high" || riskScan.level === "medium" || riskScan.level === "low" ? riskScan.level : "low";
  const groupedMatches = matches.reduce<Record<string, typeof matches>>((groups, match) => {
    const category = match.category || "unknown";

    groups[category] = groups[category] || [];
    groups[category].push(match);

    return groups;
  }, {});
  const categoryEntries = Object.entries(groupedMatches);

  return (
    <aside className={`product-risk-alert is-${level}`} aria-live="polite">
      <div className="product-risk-alert-main">
        <div className="product-risk-alert-copy">
          <div className="product-risk-alert-title">
            <strong>需要确认的表述</strong>
            <span>{LEVEL_LABELS[level]}</span>
            {matches.length ? <span>{matches.length} 个命中词</span> : null}
          </div>
          <p className="product-risk-alert-description">检测到可能需要确认的表述，请确认品牌授权、认证、功效或绝对化宣传是否真实可证明。</p>
        </div>
        <div className="product-risk-alert-actions">
          {categoryEntries.length ? (
            <button className="button ghost product-risk-alert-action" type="button" onClick={() => setIsDetailOpen((current) => !current)}>
              {isDetailOpen ? "收起详情" : "查看详情"}
            </button>
          ) : null}
          {showAction ? (
            <button className="button secondary product-risk-alert-action" type="button" onClick={onOpenRiskConfirmations || scrollToRiskConfirmations}>
              补充风险确认
            </button>
          ) : null}
        </div>
      </div>
      {isDetailOpen && categoryEntries.length ? (
        <div className="product-risk-alert-groups" aria-label="按类别分组的风险关键词">
          {categoryEntries.map(([category, categoryMatches]) => {
            const visibleMatches = categoryMatches.slice(0, CATEGORY_KEYWORD_LIMIT);
            const hiddenCount = Math.max(categoryMatches.length - CATEGORY_KEYWORD_LIMIT, 0);
            const suggestions = getRiskCategorySuggestion(category).slice(0, 3);

            return (
              <section className="product-risk-alert-group" key={category}>
                <div className="product-risk-alert-group-header">
                  <strong>{getRiskCategoryLabel(category)}</strong>
                  <p>{getRiskCategoryDescription(category)}</p>
                </div>
                <div className="product-risk-alert-chips">
                  {visibleMatches.map((match) => (
                    <span className="product-risk-alert-chip" key={`${match.category}-${match.keyword}`}>
                      {match.keyword}
                    </span>
                  ))}
                  {hiddenCount ? <span className="product-risk-alert-chip">+{hiddenCount} 项</span> : null}
                </div>
                {suggestions.length ? (
                  <div className="product-risk-alert-suggestions">
                    <span className="product-risk-alert-suggestion-title">建议改法：</span>
                    <ul className="product-risk-alert-suggestion-list">
                      {suggestions.map((suggestion) => (
                        <li key={suggestion}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
