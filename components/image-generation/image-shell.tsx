"use client";

import { ImageForm } from "@/components/image-generation/image-form";
import { ImageResult } from "@/components/image-generation/image-result";
import type { ImageGenerationFormData, ImageGenerationResult } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export function ImageShell() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFormData, setLastFormData] = useState<ImageGenerationFormData | null>(null);
  const [result, setResult] = useState<ImageGenerationResult | null>(null);

  async function handleSubmit(data: ImageGenerationFormData) {
    setLastFormData(data);
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "图片生成请求失败，请稍后再试。");
      }

      const nextResult = (await response.json()) as ImageGenerationResult;
      setResult(nextResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "图片生成失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="dashboard-content">
      <div className="image-mode-tabs">
        <Link className="active" href="/dashboard/image">
          AI 图片生成
        </Link>
        <Link href="/dashboard/image-enhance">商品图优化</Link>
      </div>
      <section className="image-generation-shell">
        <div className="image-generation-panel glass-card">
          <p className="eyebrow">AI Commerce Visual</p>
          <h2>AI 电商视觉助手</h2>
          <p className="image-generation-intro">根据商品、平台、用途和风格自动生成电商图片 Prompt，并调用通义万相生成视觉素材。</p>
          <ImageForm error={error} isLoading={isLoading} onRegenerate={lastFormData ? () => handleSubmit(lastFormData) : undefined} onSubmit={handleSubmit} resultImageUrl={result?.imageUrl} />
        </div>
        <ImageResult result={result} />
      </section>
    </main>
  );
}
