"use client";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

export type ImageEditFormData = {
  assetId: string;
  prompt: string;
  model: string;
};

type ImageEditFormProps = {
  disabled: boolean;
  error: string;
  uploadedAsset: UploadedAsset | null;
  onError: (message: string) => void;
  onUploadChange: (asset: UploadedAsset | null) => void;
  onSubmit: (data: ImageEditFormData) => void;
};

const defaultPrompt = "保留商品主体，优化为高质量电商商品图，背景更干净，光线更专业，突出产品质感。";

export function ImageEditForm({ disabled, error, onError, onSubmit, onUploadChange, uploadedAsset }: ImageEditFormProps) {
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "upload");

    const response = await fetch("/api/assets/upload", {
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

    const formData = new FormData(event.currentTarget);

    onSubmit({
      assetId: String(formData.get("assetId") || "").trim(),
      prompt: String(formData.get("prompt") || "").trim(),
      model: String(formData.get("model") || "gpt-image-2").trim(),
    });
  }

  return (
    <form className="image-edit-form" onSubmit={handleSubmit}>
      <label>
        选择图片
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
          <p>可以上传一张测试图片，或直接输入已有 Asset ID。</p>
        )}
      </div>

      {uploadedAsset ? <span>{uploadedAsset.name}</span> : null}

      <label>
        Asset ID
        <input
          key={uploadedAsset?.assetId || "manual-asset-id"}
          name="assetId"
          placeholder="输入已有图片 Asset ID"
          required
          type="text"
          defaultValue={uploadedAsset?.assetId || ""}
        />
      </label>

      <label>
        编辑 Prompt
        <textarea name="prompt" defaultValue={defaultPrompt} placeholder="描述希望如何编辑这张图片" required rows={5} />
      </label>

      <label>
        模型
        <input name="model" type="text" defaultValue="gpt-image-2" />
      </label>

      <button className="button primary" disabled={disabled} type="submit">
        {disabled ? "编辑中..." : "测试图片编辑"}
      </button>
      <p className="image-generation-helper">实验能力会调用 Run API，并按 image-enhance 类型记录 Usage 和 History。</p>
      {error ? <p className="image-generation-error">{error}</p> : null}
    </form>
  );
}
