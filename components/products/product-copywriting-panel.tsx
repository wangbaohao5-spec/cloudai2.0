"use client";

import { CopywritingResult as CopywritingResultView } from "@/components/copywriting/copywriting-result";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { WorkspaceToast } from "@/components/ui/workspace-toast";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import type { CopywritingResult } from "@/lib/types";
import { useState } from "react";

type ProductCopywritingPanelProps = {
  analysisResult: ProductAnalysisResponse | null;
  onGenerated?: () => void;
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

function buildCopywritingText(result: CopywritingResult) {
  return [
    `商品标题:\n${result.title}`,
    `核心卖点:\n${result.points.map((point) => `- ${point}`).join("\n")}`,
    `详情描述:\n${result.description}`,
    `短视频脚本:\n${result.shortVideoScript}`,
  ].join("\n\n");
}

export function ProductCopywritingPanel({ analysisResult, onGenerated }: ProductCopywritingPanelProps) {
  const [copywritingError, setCopywritingError] = useState("");
  const [copywritingResult, setCopywritingResult] = useState<CopywritingResult | null>(null);
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

      const data = (await response.json()) as CopywritingResult & { warnings?: string[] };
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

  async function handleCopyCopywriting() {
    if (!copywritingResult) {
      return;
    }

    await navigator.clipboard.writeText(buildCopywritingText(copywritingResult));
    showFeedback("复制成功");
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
              <LoadingIndicator />
              正在生成文案...
            </>
          ) : (
            "基于分析生成商品文案"
          )}
        </button>
        <p className="image-generation-helper">将调用现有商品文案接口，并继续记录 Usage 和 History。</p>
        {copywritingError ? <p className="image-generation-error">{copywritingError}</p> : null}
      </form>

      {copywritingResult ? (
        <div className="product-copywriting-result">
          <CopywritingResultView result={copywritingResult} />
          <button className="button secondary" type="button" onClick={() => void handleCopyCopywriting()}>
            复制文案结果
          </button>
        </div>
      ) : null}
    </section>
  );
}
