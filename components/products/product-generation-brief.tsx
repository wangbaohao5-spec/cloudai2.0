"use client";

import type { ProductGenerationBrief, ProductImageAnalysis } from "@/lib/product-types";
import { DEFAULT_FORBIDDEN_PRODUCT_CLAIMS, getProductGenerationBriefFromSession, getProductGenerationBriefSessionKey } from "@/lib/product-generation-brief";
import { useEffect, useMemo, useState } from "react";

type ProductGenerationBriefProps = {
  analysis: ProductImageAnalysis | null;
  analysisHistoryId?: string;
  onBriefChange?: (brief: ProductGenerationBrief) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getStringField(value: unknown, keys: string[]) {
  if (!isRecord(value)) {
    return "";
  }

  for (const key of keys) {
    const field = value[key];

    if (typeof field === "string" && field.trim()) {
      return field.trim();
    }
  }

  return "";
}

function compactItems(...groups: unknown[]) {
  return groups
    .flatMap((group) => {
      if (!group) {
        return [];
      }

      return Array.isArray(group) ? group : [group];
    })
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items));
}

function linesToItems(value: string) {
  return uniqueItems(
    value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function itemsToLines(items: string[]) {
  return items.join("\n");
}

function renderPreviewItems(items: string[], fallback: string) {
  const visibleItems = items.slice(0, 3);

  if (!visibleItems.length) {
    return <span>{fallback}</span>;
  }

  return (
    <>
      {visibleItems.map((item) => (
        <span key={item}>{item}</span>
      ))}
      {items.length > visibleItems.length ? <span>+{items.length - visibleItems.length} 项</span> : null}
    </>
  );
}

function buildBriefFromAnalysis(analysis: ProductImageAnalysis | null): ProductGenerationBrief {
  const riskConfirmations = {
    confirmedBrandClaims: "",
    forbiddenClaims: DEFAULT_FORBIDDEN_PRODUCT_CLAIMS,
    complianceNotes: "",
  };

  if (!analysis) {
    return {
      avoidChanges: [],
      coreSellingPoints: [],
      extraRequirements: "",
      mustKeepDetails: [],
      productName: "",
      riskConfirmations,
      styleRequirements: "",
      targetAudience: "",
      usageScenarios: [],
    };
  }

  return {
    avoidChanges: uniqueItems(compactItems(analysis.avoidChanges)),
    coreSellingPoints: uniqueItems(compactItems(analysis.sellingPoints, getStringField(analysis, ["coreSellingPoints"]))),
    extraRequirements: "",
    mustKeepDetails: uniqueItems(compactItems(analysis.mustKeepDetails)),
    productName: getStringField(analysis, ["productName", "suggestedName"]) || analysis.productNameSuggestions?.[0] || "",
    riskConfirmations,
    styleRequirements: compactItems(analysis.detailPageHints?.visualMood, analysis.visualStyle)[0] || "",
    targetAudience: analysis.targetAudience || "",
    usageScenarios: uniqueItems(compactItems(analysis.detailPageHints?.usageScenes, analysis.scenes)),
  };
}

export function ProductGenerationBriefEditor({ analysis, analysisHistoryId, onBriefChange }: ProductGenerationBriefProps) {
  const aiBrief = useMemo(() => buildBriefFromAnalysis(analysis), [analysis]);
  const storageKey = getProductGenerationBriefSessionKey(analysisHistoryId);
  const [brief, setBrief] = useState<ProductGenerationBrief>(aiBrief);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const nextBrief = getProductGenerationBriefFromSession(analysisHistoryId) || aiBrief;

    setBrief(nextBrief);
    setStatus("");
    onBriefChange?.(nextBrief);
  }, [aiBrief, analysisHistoryId, onBriefChange]);

  function updateBrief(nextBrief: ProductGenerationBrief) {
    setBrief(nextBrief);
    setStatus("");
  }

  function updateRiskConfirmations(nextRiskConfirmations: NonNullable<ProductGenerationBrief["riskConfirmations"]>) {
    updateBrief({
      ...brief,
      riskConfirmations: {
        confirmedBrandClaims: nextRiskConfirmations.confirmedBrandClaims || "",
        forbiddenClaims: nextRiskConfirmations.forbiddenClaims || "",
        complianceNotes: nextRiskConfirmations.complianceNotes || "",
      },
    });
  }

  function handleSave() {
    if (!storageKey) {
      setStatus("当前商品暂无可保存的分析记录。");
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(brief));
    onBriefChange?.(brief);
    setStatus("已保存");
    setIsEditing(false);
  }

  function handleReset() {
    updateBrief(aiBrief);

    if (storageKey) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(aiBrief));
    }

    onBriefChange?.(aiBrief);
    setStatus("已重置为 AI 分析结果");
    setIsEditing(false);
  }

  if (!analysis) {
    return null;
  }

  return (
    <section className="product-generation-brief cai-card cai-card--compact">
      <div className="product-generation-brief-header">
        <div>
          <p className="eyebrow">Generation Brief</p>
          <h3>商品卖点 & 生成要求</h3>
          <p>CloudAI 会根据商品分析整理一份生成任务书。你可以按需编辑卖点、风格和必须保留的细节，后续生成图片和详情页时会优先参考这些内容。</p>
        </div>
        <div className="product-generation-brief-summary" aria-label="生成任务书摘要">
          <span>卖点 {brief.coreSellingPoints.length}</span>
          <span>保留 {brief.mustKeepDetails.length}</span>
          <span>{brief.riskConfirmations?.forbiddenClaims ? "已设置风险限制" : "待确认风险"}</span>
          <span>{brief.styleRequirements ? "已填写风格" : "待补充风格"}</span>
        </div>
      </div>

      {!isEditing ? (
        <div className="product-generation-brief-compact" id="product-risk-confirmations">
          <div className="product-generation-brief-compact-main">
            <div>
              <span>商品名称</span>
              <strong>{brief.productName || "待补充商品名称"}</strong>
            </div>
            <div>
              <span>目标用户</span>
              <p>{brief.targetAudience || "待补充目标用户"}</p>
            </div>
            <div>
              <span>风格要求</span>
              <p>{brief.styleRequirements || "可按套图、详情页或平台需求补充风格。"}</p>
            </div>
          </div>

          <div className="product-generation-brief-preview-grid">
            <section>
              <strong>核心卖点</strong>
              <div>{renderPreviewItems(brief.coreSellingPoints, "暂无卖点，可编辑补充")}</div>
            </section>
            <section>
              <strong>必须保留</strong>
              <div>{renderPreviewItems(brief.mustKeepDetails, "暂无保真细节，可编辑补充")}</div>
            </section>
            <section>
              <strong>避免改动</strong>
              <div>{renderPreviewItems(brief.avoidChanges, "暂无限制，可编辑补充")}</div>
            </section>
          </div>

          <div className="product-generation-brief-compact-actions">
            <button className="button primary" type="button" onClick={() => setIsEditing(true)}>
              编辑生成要求
            </button>
            <button className="button ghost" type="button" onClick={handleReset}>
              重置为 AI 分析结果
            </button>
            {status ? <span>{status}</span> : null}
          </div>
        </div>
      ) : (
        <>
      <div className="product-generation-brief-grid">
        <label>
          商品名称
          <input value={brief.productName} placeholder="例如：粉蓝配色机械键盘" onChange={(event) => updateBrief({ ...brief, productName: event.target.value })} />
        </label>

        <label>
          目标用户
          <input value={brief.targetAudience} placeholder="例如：桌搭爱好者、办公用户、礼物购买者" onChange={(event) => updateBrief({ ...brief, targetAudience: event.target.value })} />
        </label>

        <label className="product-generation-brief-wide">
          核心卖点
          <textarea
            rows={4}
            value={itemsToLines(brief.coreSellingPoints)}
            placeholder="每行一个卖点"
            onChange={(event) => updateBrief({ ...brief, coreSellingPoints: linesToItems(event.target.value) })}
          />
        </label>

        <label>
          使用场景
          <textarea
            rows={4}
            value={itemsToLines(brief.usageScenarios)}
            placeholder="每行一个场景，例如：居家桌搭、办公桌面、礼物场景"
            onChange={(event) => updateBrief({ ...brief, usageScenarios: linesToItems(event.target.value) })}
          />
        </label>

        <label>
          风格要求
          <textarea
            rows={4}
            value={brief.styleRequirements}
            placeholder="例如：柔和、干净、现代电商、保留商品主体细节"
            onChange={(event) => updateBrief({ ...brief, styleRequirements: event.target.value })}
          />
        </label>

        <label>
          必须保留
          <textarea
            rows={4}
            value={itemsToLines(brief.mustKeepDetails)}
            placeholder="每行一个必须保留的商品细节"
            onChange={(event) => updateBrief({ ...brief, mustKeepDetails: linesToItems(event.target.value) })}
          />
        </label>

        <label>
          避免改动
          <textarea
            rows={4}
            value={itemsToLines(brief.avoidChanges)}
            placeholder="每行一个不要改变的结构、颜色、图案或表达"
            onChange={(event) => updateBrief({ ...brief, avoidChanges: linesToItems(event.target.value) })}
          />
        </label>

        <label className="product-generation-brief-wide">
          其他补充要求
          <textarea
            rows={4}
            value={brief.extraRequirements}
            placeholder="补充平台、画面、文案、材质、细节、禁忌等要求"
            onChange={(event) => updateBrief({ ...brief, extraRequirements: event.target.value })}
          />
        </label>
      </div>

      <div className="product-generation-brief-risk" id="product-risk-confirmations">
        <div>
          <h4>风险确认</h4>
          <p>请确认哪些品牌、授权、认证、材质或功效信息可以使用。未明确提供的信息，CloudAI 会尽量避免自动生成。如果后续生成结果出现风险提示，请回到这里补充或限制相关表述。</p>
        </div>

        <div className="product-generation-brief-grid">
          <label className="product-generation-brief-wide">
            可使用的品牌/授权信息
            <textarea
              rows={3}
              value={brief.riskConfirmations?.confirmedBrandClaims || ""}
              placeholder="如果确实有官方授权、品牌联名、认证或检测报告，请在这里说明。没有则留空。"
              onChange={(event) =>
                updateRiskConfirmations({
                  ...brief.riskConfirmations,
                  confirmedBrandClaims: event.target.value,
                })
              }
            />
          </label>

          <label>
            禁止生成的表述
            <textarea
              rows={3}
              value={brief.riskConfirmations?.forbiddenClaims || DEFAULT_FORBIDDEN_PRODUCT_CLAIMS}
              onChange={(event) =>
                updateRiskConfirmations({
                  ...brief.riskConfirmations,
                  forbiddenClaims: event.target.value,
                })
              }
            />
          </label>

          <label>
            其它真实性备注
            <textarea
              rows={3}
              value={brief.riskConfirmations?.complianceNotes || ""}
              placeholder="例如材质、功效、产地、适用人群等需要谨慎表达的内容。"
              onChange={(event) =>
                updateRiskConfirmations({
                  ...brief.riskConfirmations,
                  complianceNotes: event.target.value,
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="product-generation-brief-actions">
        <button className="button secondary" type="button" onClick={handleSave}>
          保存到本次商品
        </button>
        <button className="button ghost" type="button" onClick={handleReset}>
          重置为 AI 分析结果
        </button>
        <button className="button ghost" type="button" onClick={() => setIsEditing(false)}>
          收起编辑
        </button>
        {status ? <span>{status}</span> : null}
      </div>
        </>
      )}
    </section>
  );
}
