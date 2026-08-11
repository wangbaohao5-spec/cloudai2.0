"use client";

import { EnhanceForm } from "@/components/image-enhance/enhance-form";
import { EnhanceResult } from "@/components/image-enhance/enhance-result";
import { ImageUpload } from "@/components/image-enhance/image-upload";
import { ImageModeTabs } from "@/components/image-navigation/image-mode-tabs";
import type { ImageEnhanceInput, ImageEnhanceResult } from "@/lib/ai/image-enhance-provider";
import { useState } from "react";

export default function ImageEnhancePage() {
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastInput, setLastInput] = useState<ImageEnhanceInput | null>(null);
  const [result, setResult] = useState<ImageEnhanceResult | null>(null);

  async function handleSubmit(data: ImageEnhanceInput) {
    setError("");
    setIsLoading(true);
    setLastInput(data);

    try {
      const response = await fetch("/api/image-enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "图片优化请求失败，请稍后再试。");
      }

      const nextResult = (await response.json()) as ImageEnhanceResult;
      setResult(nextResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "图片优化失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="dashboard-content">
      <ImageModeTabs />
      <section className="image-enhance-shell">
        <div className="image-enhance-panel glass-card">
          <p className="eyebrow">Image Enhance</p>
          <h2>商品图智能优化</h2>
          <p className="image-generation-intro">上传商品图，填写平台、用途和风格，第一阶段先生成 mock 优化任务。</p>
          <ImageUpload
            fileName={fileName}
            previewUrl={previewUrl}
            onChange={(nextFileName, nextPreviewUrl) => {
              setFileName(nextFileName);
              setPreviewUrl(nextPreviewUrl);
            }}
          />
          <EnhanceForm disabled={isLoading} fileName={fileName} imagePreviewUrl={previewUrl} onSubmit={handleSubmit} />
          {lastInput ? (
            <button className="button secondary" disabled={isLoading} type="button" onClick={() => void handleSubmit(lastInput)}>
              重新优化
            </button>
          ) : null}
          {error ? <p className="image-generation-error">{error}</p> : null}
        </div>
        <EnhanceResult input={lastInput} result={result} />
      </section>
    </main>
  );
}
