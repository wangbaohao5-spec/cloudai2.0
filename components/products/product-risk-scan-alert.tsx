"use client";

type RiskLevel = "none" | "low" | "medium" | "high";

type ProductRiskScanAlertProps = {
  riskScan?: {
    level: RiskLevel;
    matches?: Array<{
      category: string;
      keyword: string;
      level: string;
    }>;
    summary?: string;
  } | null;
};

const LEVEL_LABELS: Record<Exclude<RiskLevel, "none">, string> = {
  high: "高风险提示",
  low: "轻提示",
  medium: "注意",
};

const CHIP_LIMIT = 8;

export function ProductRiskScanAlert({ riskScan }: ProductRiskScanAlertProps) {
  if (!riskScan || riskScan.level === "none") {
    return null;
  }

  const matches = Array.isArray(riskScan.matches) ? riskScan.matches.filter((match) => match.keyword?.trim()) : [];
  const visibleMatches = matches.slice(0, CHIP_LIMIT);
  const hiddenCount = Math.max(matches.length - CHIP_LIMIT, 0);
  const level = riskScan.level === "high" || riskScan.level === "medium" || riskScan.level === "low" ? riskScan.level : "low";

  return (
    <aside className={`product-risk-alert is-${level}`} aria-live="polite">
      <div className="product-risk-alert-title">
        <strong>需要确认的表述</strong>
        <span>{LEVEL_LABELS[level]}</span>
      </div>
      <p className="product-risk-alert-description">
        {riskScan.summary || "检测到可能需要用户确认的商品描述。"} 请确认这些内容是否真实、可证明，避免使用未经确认的授权、认证、功效或绝对化宣传。
      </p>
      {visibleMatches.length ? (
        <div className="product-risk-alert-chips" aria-label="命中的风险关键词">
          {visibleMatches.map((match) => (
            <span className="product-risk-alert-chip" key={`${match.category}-${match.keyword}`}>
              {match.keyword}
            </span>
          ))}
          {hiddenCount ? <span className="product-risk-alert-chip">+{hiddenCount} 项</span> : null}
        </div>
      ) : null}
    </aside>
  );
}
