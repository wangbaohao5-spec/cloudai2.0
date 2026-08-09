"use client";

import { ImageEditForm, type ImageEditFormData } from "@/components/image-edit/image-edit-form";
import { ImageEditResult, type ImageEditViewResult } from "@/components/image-edit/image-edit-result";
import Link from "next/link";
import { useState } from "react";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

export function ImageEditShell() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImageEditViewResult | null>(null);
  const [uploadedAsset, setUploadedAsset] = useState<UploadedAsset | null>(null);

  async function handleSubmit(data: ImageEditFormData) {
    if (!data.assetId) {
      setError("请输入或上传一张图片 Asset。");
      return;
    }

    if (!data.prompt) {
      setError("请输入图片编辑 Prompt。");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/image/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "图片编辑请求失败，请稍后再试。");
      }

      setResult((await response.json()) as ImageEditViewResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "图片编辑失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="dashboard-content">
      <div className="image-mode-tabs">
        <Link href="/dashboard/image">AI 图片生成</Link>
        <Link href="/dashboard/image-enhance">商品图优化</Link>
        <Link className="active" href="/dashboard/image-edit">
          图片编辑实验
        </Link>
      </div>
      <section className="image-edit-shell">
        <div className="image-edit-panel glass-card">
          <p className="eyebrow">Image Edit Lab</p>
          <h2>GPT-image-2 图片编辑实验</h2>
          <p className="image-generation-intro">上传图片或输入已有 Asset ID，通过 Run API 测试 GPT-image-2 edit 链路。</p>
          <ImageEditForm
            disabled={isLoading}
            error={error}
            uploadedAsset={uploadedAsset}
            onError={setError}
            onSubmit={handleSubmit}
            onUploadChange={(asset) => {
              setError("");
              setUploadedAsset(asset);
            }}
          />
        </div>
        <ImageEditResult result={result} />
      </section>
    </main>
  );
}
