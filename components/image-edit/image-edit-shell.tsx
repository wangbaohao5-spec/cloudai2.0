"use client";

import { ImageEditForm, type ImageEditFormData } from "@/components/image-edit/image-edit-form";
import { ImageEditResult, type ImageEditViewResult } from "@/components/image-edit/image-edit-result";
import { ImageModeTabs } from "@/components/image-navigation/image-mode-tabs";
import { getProductImageEditGoal } from "@/lib/product-image-edit-options";
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
      setError("请先上传一张商品图片。");
      return;
    }

    if (!data.prompt) {
      setError("请输入商品图精修 Prompt。");
      return;
    }

    const model = "gpt-image-2";
    const goal = getProductImageEditGoal(data.goalId);

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/image/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId: data.assetId,
          prompt: data.prompt,
          model,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "图片编辑请求失败，请稍后再试。");
      }

      const editResult = (await response.json()) as Pick<ImageEditViewResult, "imageUrl" | "assetId">;
      setResult({
        ...editResult,
        goalTitle: goal.title,
        prompt: data.prompt,
        model,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "图片编辑失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="dashboard-content">
      <ImageModeTabs />
      <section className="image-edit-shell">
        <div className="image-edit-panel glass-card">
          <p className="eyebrow">Product Image Studio</p>
          <h2>商品图精修</h2>
          <p className="image-generation-intro">优化商品原图的背景、光线、质感和展示效果，保持商品主体保真。</p>
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
