"use client";

import { buildProductImageEditPrompt } from "@/lib/ai/product-image-edit-prompt-builder";
import type { ProductImageEditGoalId } from "@/lib/product-image-edit-options";
import { ImageEditGoalSelector } from "@/components/image-edit/image-edit-goal-selector";
import { fetchWithAuthHandling } from "@/lib/authenticated-fetch";
import { useState } from "react";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

export type ImageEditFormData = {
  assetId: string;
  prompt: string;
  goalId: ProductImageEditGoalId;
};

type ImageEditFormProps = {
  disabled: boolean;
  error: string;
  uploadedAsset: UploadedAsset | null;
  onError: (message: string) => void;
  onUploadChange: (asset: UploadedAsset | null) => void;
  onSubmit: (data: ImageEditFormData) => void;
};

export function ImageEditForm({ disabled, error, onError, onSubmit, onUploadChange, uploadedAsset }: ImageEditFormProps) {
  const defaultGoalId: ProductImageEditGoalId = "main-image";
  const [goalId, setGoalId] = useState<ProductImageEditGoalId>(defaultGoalId);
  const [prompt, setPrompt] = useState(() => buildProductImageEditPrompt({ goalId: defaultGoalId }));

  function handleGoalChange(nextGoalId: ProductImageEditGoalId) {
    setGoalId(nextGoalId);
    setPrompt(buildProductImageEditPrompt({ goalId: nextGoalId }));
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "upload");

    const response = await fetchWithAuthHandling("/api/assets/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorData?.error || "图片上传失败，请稍后再试。");
    }

    onUploadChange((await response.json()) as UploadedAsset);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      assetId: uploadedAsset?.assetId || "",
      prompt: prompt.trim(),
      goalId,
    });
  }

  return (
    <form className="image-edit-form" onSubmit={handleSubmit}>
      <label>
        上传商品图片
        <input
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          type="file"
          onChange={(event) => {
            void handleFileChange(event).catch((caughtError) => {
              onUploadChange(null);
              onError(caughtError instanceof Error ? caughtError.message : "图片上传失败，请稍后再试。");
            });
          }}
        />
      </label>

      <div className="image-edit-preview">
        {uploadedAsset?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={uploadedAsset.name || "待编辑图片"} src={uploadedAsset.url} />
        ) : (
          <p>上传任意商品图片后，即可选择优化方向并补充自由编辑要求。</p>
        )}
      </div>

      {uploadedAsset ? <span>{uploadedAsset.name}</span> : null}

      <ImageEditGoalSelector value={goalId} onChange={handleGoalChange} />

      <label>
        优化 Prompt
        <textarea
          name="prompt"
          placeholder="系统会根据优化目标生成基础 Prompt，你也可以追加具体要求。"
          required
          rows={6}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>

      <button className="cai-button cai-button--primary cai-button--full" disabled={disabled} type="submit">
        {disabled ? "优化中..." : "优化商品图片"}
      </button>
      <p className="image-generation-helper">将使用图片编辑链路处理当前商品图，并记录到额度中心和历史记录。</p>
      {error ? <p className="image-generation-error">{error}</p> : null}
    </form>
  );
}
