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
        throw new Error("文案生成请求失败，请稍后再试。");
      }

      const nextResult = (await response.json()) as CopywritingResultData;
      setResult(nextResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "文案生成失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="dashboard-content">
      <section className="copywriting-shell">
        <div className="copywriting-panel glass-card">
          <p className="eyebrow">AI Copywriting</p>
          <h2>商品信息表单</h2>
          <CopywritingForm error={error} isLoading={isLoading} onSubmit={handleSubmit} />
        </div>
        <CopywritingResult result={result} />
      </section>
    </main>
  );
}
