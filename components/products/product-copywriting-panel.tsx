"use client";

import { AiThinkingLoading } from "@/components/ui/loading";
import { ProductRiskScanAlert } from "@/components/products/product-risk-scan-alert";
import { WorkspaceToast } from "@/components/ui/workspace-toast";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import type { CopywritingResult } from "@/lib/types";
import { useState } from "react";

type ProductCopywritingPanelProps = {
  analysisResult: ProductAnalysisResponse | null;
  onGenerated?: () => void;
};

type ProductRiskScan = {
  level: "none" | "low" | "medium" | "high";
  matches?: Array<{
    category: string;
    keyword: string;
    level: string;
  }>;
  summary?: string;
};

type ProductCopywritingResponse = CopywritingResult & {
  riskScan?: ProductRiskScan;
  warnings?: string[];
};

const platformOptions = [
  { value: "taobao", label: "淘宝" },
  { value: "amazon", label: "Amazon" },
  { value: "tiktok", label: "TikTok Shop" },
];

const toneOptions = [
  { value: "专业", label: "专业" },
  { value: "年轻", label: "年轻" },
  { value: "高端", label: "高端" },
  { value: "促销", label: "促销" },
];

const outputTargetOptions = [
  { value: "title", label: "商品标题" },
  { value: "selling-points", label: "核心卖点" },
  { value: "description", label: "商品详情" },
  { value: "ad-copy", label: "社交媒体文案" },
];

type CopywritingSectionData = {
  adCopy: string;
  description: string;
  points: string[];
  rawText: string;
  socialPost: string;
  title: string;
  videoScript: string;
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

function getStringArrayField(value: unknown, keys: string[]) {
  if (!isRecord(value)) {
    return [];
  }

  for (const key of keys) {
    const field = value[key];

    if (Array.isArray(field)) {
      const items = field.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);

      if (items.length) {
        return items;
      }
    }
  }

  return [];
}

function normalizeCopywritingResult(result: unknown): CopywritingSectionData {
  if (typeof result === "string") {
    return {
      adCopy: "",
      description: "",
      points: [],
      rawText: result.trim(),
      socialPost: "",
      title: "",
      videoScript: "",
    };
  }

  return {
    adCopy: getStringField(result, ["adCopy", "adText", "marketingCopy"]),
    description: getStringField(result, ["description", "productDescription", "detailDescription"]),
    points: getStringArrayField(result, ["points", "sellingPoints", "bulletPoints", "highlights"]),
    rawText: getStringField(result, ["text", "content", "fullText"]),
    socialPost: getStringField(result, ["socialPost", "socialCopy", "xiaohongshuCopy", "tiktokCopy", "instagramCopy"]),
    title: getStringField(result, ["title", "productTitle", "headline"]),
    videoScript: getStringField(result, ["shortVideoScript", "videoScript", "script"]),
  };
}

function buildCopywritingText(result: unknown) {
  const sections = normalizeCopywritingResult(result);

  if (sections.rawText && !sections.title && !sections.points.length && !sections.description && !sections.socialPost && !sections.adCopy && !sections.videoScript) {
    return sections.rawText;
  }

  return [
    sections.title ? `商品标题：\n${sections.title}` : "",
    sections.points.length ? `核心卖点：\n${sections.points.map((point, index) => `${index + 1}. ${point}`).join("\n")}` : "",
    sections.description ? `商品描述：\n${sections.description}` : "",
    sections.socialPost ? `平台文案：\n${sections.socialPost}` : "",
    sections.adCopy ? `营销文案：\n${sections.adCopy}` : "",
    sections.videoScript ? `短视频脚本：\n${sections.videoScript}` : "",
    sections.rawText ? `完整文案：\n${sections.rawText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function CopyButton({
  copiedKey,
  copyKey,
  label,
  onCopy,
  text,
}: {
  copiedKey: string;
  copyKey: string;
  label: string;
  onCopy: (text: string, key: string) => void;
  text: string;
}) {
  return (
    <button className="copywriting-copy-button" type="button" onClick={() => onCopy(text, copyKey)}>
      {copiedKey === copyKey ? "已复制" : label}
    </button>
  );
}

function ProductCopywritingResultSections({
  copiedKey,
  onCopy,
  result,
}: {
  copiedKey: string;
  onCopy: (text: string, key: string) => void;
  result: CopywritingResult | string | Record<string, unknown>;
}) {
  const sections = normalizeCopywritingResult(result);
  const allText = buildCopywritingText(result);
  const hasStructuredContent = Boolean(
    sections.title || sections.points.length || sections.description || sections.socialPost || sections.adCopy || sections.videoScript,
  );

  if (!hasStructuredContent && sections.rawText) {
    return (
      <article className="copywriting-section-card">
        <div className="copywriting-section-header">
          <div>
            <strong>完整文案</strong>
            <span>旧格式或纯文本结果</span>
          </div>
          <CopyButton copiedKey={copiedKey} copyKey="raw" label="复制文案" text={sections.rawText} onCopy={onCopy} />
        </div>
        <p className="copywriting-block">{sections.rawText}</p>
      </article>
    );
  }

  return (
    <div className="copywriting-section-list">
      <div className="copywriting-result-toolbar">
        <div>
          <strong>分段文案</strong>
          <span>按上架、详情页和内容平台场景单独复制</span>
        </div>
        {allText ? <CopyButton copiedKey={copiedKey} copyKey="all" label="复制全部" text={allText} onCopy={onCopy} /> : null}
      </div>

      {sections.title ? (
        <article className="copywriting-section-card">
          <div className="copywriting-section-header">
            <div>
              <strong>商品标题</strong>
              <span>适合复制到商品上架后台</span>
            </div>
            <CopyButton copiedKey={copiedKey} copyKey="title" label="复制标题" text={sections.title} onCopy={onCopy} />
          </div>
          <h3>{sections.title}</h3>
        </article>
      ) : null}

      {sections.points.length ? (
        <article className="copywriting-section-card">
          <div className="copywriting-section-header">
            <div>
              <strong>核心卖点</strong>
              <span>适合详情页图、主图角标和卖点区</span>
            </div>
            <CopyButton copiedKey={copiedKey} copyKey="points" label="复制全部卖点" text={sections.points.map((point, index) => `${index + 1}. ${point}`).join("\n")} onCopy={onCopy} />
          </div>
          <ul className="copywriting-bullet-list">
            {sections.points.map((point, index) => (
              <li key={`${index}-${point}`}>
                <span>{point}</span>
                <CopyButton copiedKey={copiedKey} copyKey={`point-${index}`} label="复制" text={point} onCopy={onCopy} />
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {sections.description ? (
        <article className="copywriting-section-card">
          <div className="copywriting-section-header">
            <div>
              <strong>商品描述</strong>
              <span>适合商品详情、店铺介绍和素材包正文</span>
            </div>
            <CopyButton copiedKey={copiedKey} copyKey="description" label="复制描述" text={sections.description} onCopy={onCopy} />
          </div>
          <p className="copywriting-block">{sections.description}</p>
        </article>
      ) : null}

      {sections.socialPost || sections.adCopy ? (
        <article className="copywriting-section-card">
          <div className="copywriting-section-header">
            <div>
              <strong>平台文案</strong>
              <span>适合小红书、抖音或广告投放素材</span>
            </div>
            <CopyButton copiedKey={copiedKey} copyKey="social" label="复制文案" text={[sections.socialPost, sections.adCopy].filter(Boolean).join("\n\n")} onCopy={onCopy} />
          </div>
          {sections.socialPost ? <p className="copywriting-block">{sections.socialPost}</p> : null}
          {sections.adCopy ? <p className="copywriting-block">{sections.adCopy}</p> : null}
        </article>
      ) : null}

      {sections.videoScript ? (
        <article className="copywriting-section-card">
          <div className="copywriting-section-header">
            <div>
              <strong>短视频脚本</strong>
              <span>适合口播、拍摄脚本和剪辑提词</span>
            </div>
            <CopyButton copiedKey={copiedKey} copyKey="video-script" label="复制脚本" text={sections.videoScript} onCopy={onCopy} />
          </div>
          <p className="copywriting-block">{sections.videoScript}</p>
        </article>
      ) : null}
    </div>
  );
}

export function ProductCopywritingPanel({ analysisResult, onGenerated }: ProductCopywritingPanelProps) {
  const [copywritingError, setCopywritingError] = useState("");
  const [copywritingResult, setCopywritingResult] = useState<ProductCopywritingResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "success" } | null>(null);
  const [isCopywritingLoading, setIsCopywritingLoading] = useState(false);

  function showFeedback(message: string, tone: "error" | "success" = "success") {
    setFeedback({ message, tone });
    window.setTimeout(() => setFeedback(null), 2200);
  }

  async function handleGenerateCopywriting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!analysisResult?.historyId) {
      const message = "请先完成商品图片分析，再生成商品文案。";
      setCopywritingError(message);
      showFeedback(message, "error");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const outputType = String(formData.get("outputType") || outputTargetOptions[0].value);

    setCopywritingError("");
    setIsCopywritingLoading(true);

    try {
      const response = await fetch("/api/products/copywriting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisHistoryId: analysisResult.historyId,
          platform: String(formData.get("platform") || ""),
          tone: String(formData.get("tone") || ""),
          outputType,
          outputTypes: [outputType],
          generationMode: "single",
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "基于商品分析生成文案失败，请稍后再试。");
      }

      const data = (await response.json()) as ProductCopywritingResponse;
      setCopywritingResult(data);

      if (!data.warnings?.length) {
        onGenerated?.();
        showFeedback("文案生成完成");
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "基于商品分析生成文案失败，请稍后再试。";
      setCopywritingError(message);
      showFeedback(message, "error");
    } finally {
      setIsCopywritingLoading(false);
    }
  }

  async function handleCopyText(text: string, key: string) {
    if (!text.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showFeedback("复制成功");
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1600);
    } catch {
      const message = "复制失败，请手动选择文本复制。";
      setCopywritingError(message);
      showFeedback(message, "error");
    }
  }

  if (!analysisResult) {
    return (
      <section className="product-copywriting-panel glass-card" id="product-copywriting-panel">
        <p className="eyebrow">Next Step</p>
        <h2>AI 商品营销文案</h2>
        <p className="image-generation-intro">先完成商品图片分析，CloudAI 会把识别到的类别、卖点和目标用户转成可发布的电商文案。</p>
      </section>
    );
  }

  return (
    <section className="product-copywriting-panel glass-card" id="product-copywriting-panel">
      {feedback ? <WorkspaceToast message={feedback.message} tone={feedback.tone} /> : null}
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Next Step</p>
          <h2>AI 商品营销文案</h2>
          <p className="image-generation-intro">基于当前商品分析结果生成电商营销文案。</p>
        </div>
        <span>已连接分析结果</span>
      </div>

      <form className="product-copywriting-form" onSubmit={(event) => void handleGenerateCopywriting(event)}>
        <label>
          平台选择
          <select name="platform" defaultValue="taobao">
            {platformOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          文案风格选择
          <select name="tone" defaultValue="专业">
            {toneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          生成目标选择
          <select name="outputType" defaultValue="title">
            {outputTargetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary" disabled={!analysisResult.historyId || isCopywritingLoading} type="submit">
          {isCopywritingLoading ? (
            <>
              <AiThinkingLoading size="sm" />
              正在生成文案...
            </>
          ) : (
            "基于分析生成商品文案"
          )}
        </button>
        <p className="image-generation-helper">将使用现有商品文案能力，并继续记录到额度中心和历史记录。</p>
        {copywritingError ? <p className="image-generation-error">{copywritingError}</p> : null}
      </form>

      {copywritingResult ? (
        <div className="product-copywriting-result">
          <ProductRiskScanAlert riskScan={copywritingResult.riskScan} />
          <ProductCopywritingResultSections copiedKey={copiedKey} result={copywritingResult} onCopy={(text, key) => void handleCopyText(text, key)} />
        </div>
      ) : null}
    </section>
  );
}
