"use client";

import { CopywritingForm } from "@/components/copywriting/copywriting-form";
import { CopywritingResult } from "@/components/copywriting/copywriting-result";
import type { CopywritingFormData, CopywritingResult as CopywritingResultData } from "@/lib/types";
import { useState } from "react";

export function CopywritingShell() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CopywritingResultData | null>(null);

  async function handleSubmit(data: CopywritingFormData) {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/copywriting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("上架文案请求失败，请稍后再试。");
      }

      const nextResult = (await response.json()) as CopywritingResultData;
      setResult(nextResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "上架文案制作失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="dashboard-content">
      <section className="copywriting-shell">
        <div className="copywriting-panel cai-card cai-card--compact">
          <p className="eyebrow">Commerce Tool</p>
          <h2>上架文案</h2>
          <p className="image-generation-intro">输入商品基础信息和卖点，快速生成适合上架使用的标题、卖点、商品描述和平台文案。</p>
          <CopywritingForm error={error} isLoading={isLoading} onSubmit={handleSubmit} />
        </div>
        <CopywritingResult result={result} />
      </section>
    </main>
  );
}
