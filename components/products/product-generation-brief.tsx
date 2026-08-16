"use client";

import type { ProductGenerationBrief, ProductImageAnalysis } from "@/lib/product-types";
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

function getStorageKey(analysisHistoryId?: string) {
  return analysisHistoryId ? `cloudai:products:generation-brief:${analysisHistoryId}` : "";
}

function buildBriefFromAnalysis(analysis: ProductImageAnalysis | null): ProductGenerationBrief {
  if (!analysis) {
    return {
      avoidChanges: [],
      coreSellingPoints: [],
      extraRequirements: "",
      mustKeepDetails: [],
      productName: "",
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
    styleRequirements: compactItems(analysis.detailPageHints?.visualMood, analysis.visualStyle)[0] || "",
    targetAudience: analysis.targetAudience || "",
    usageScenarios: uniqueItems(compactItems(analysis.detailPageHints?.usageScenes, analysis.scenes)),
  };
}

function normalizeStoredBrief(value: unknown, fallback: ProductGenerationBrief): ProductGenerationBrief {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    avoidChanges: uniqueItems(compactItems(value.avoidChanges)),
    coreSellingPoints: uniqueItems(compactItems(value.coreSellingPoints)),
    extraRequirements: getStringField(value, ["extraRequirements"]),
    mustKeepDetails: uniqueItems(compactItems(value.mustKeepDetails)),
    productName: getStringField(value, ["productName"]),
    styleRequirements: getStringField(value, ["styleRequirements"]),
    targetAudience: getStringField(value, ["targetAudience"]),
    usageScenarios: uniqueItems(compactItems(value.usageScenarios)),
  };
}

function parseStoredBrief(rawValue: string | null, fallback: ProductGenerationBrief) {
  if (!rawValue) {
    return fallback;
  }

  try {
    return normalizeStoredBrief(JSON.parse(rawValue), fallback);
  } catch {
    return fallback;
  }
}

export function ProductGenerationBriefEditor({ analysis, analysisHistoryId, onBriefChange }: ProductGenerationBriefProps) {
  const aiBrief = useMemo(() => buildBriefFromAnalysis(analysis), [analysis]);
  const storageKey = getStorageKey(analysisHistoryId);
  const [brief, setBrief] = useState<ProductGenerationBrief>(aiBrief);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const nextBrief = storageKey ? parseStoredBrief(window.sessionStorage.getItem(storageKey), aiBrief) : aiBrief;

    setBrief(nextBrief);
    setStatus("");
    onBriefChange?.(nextBrief);
  }, [aiBrief, onBriefChange, storageKey]);

  function updateBrief(nextBrief: ProductGenerationBrief) {
    setBrief(nextBrief);
    setStatus("");
    onBriefChange?.(nextBrief);
  }

  function handleSave() {
    if (!storageKey) {
      setStatus("当前商品暂无可保存的分析记录。");
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(brief));
    setStatus("已保存");
  }

  function handleReset() {
    updateBrief(aiBrief);

    if (storageKey) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(aiBrief));
    }

    setStatus("已重置为 AI 分析结果");
  }

  if (!analysis) {
    return null;
  }

  return (
    <section className="product-generation-brief">
      <div className="product-generation-brief-header">
        <div>
          <p className="eyebrow">Generation Brief</p>
          <h3>商品卖点 & 生成要求</h3>
          <p>CloudAI 会根据商品分析整理一份生成任务书。你可以补充或修改卖点、风格和必须保留的细节，后续生成图片和详情页时会优先参考这些内容。</p>
        </div>
        <div className="product-generation-brief-summary" aria-label="生成任务书摘要">
          <span>卖点 {brief.coreSellingPoints.length}</span>
          <span>保留 {brief.mustKeepDetails.length}</span>
          <span>{brief.styleRequirements ? "已填写风格" : "待补充风格"}</span>
        </div>
      </div>

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

      <div className="product-generation-brief-actions">
        <button className="button secondary" type="button" onClick={handleSave}>
          保存到本次商品
        </button>
        <button className="button ghost" type="button" onClick={handleReset}>
          重置为 AI 分析结果
        </button>
        {status ? <span>{status}</span> : null}
      </div>
    </section>
  );
}
