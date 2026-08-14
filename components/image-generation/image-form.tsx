import { LongGenerationLoading } from "@/components/ui/loading";
import type { ImageGenerationFormData } from "@/lib/types";

const platformOptions = [
  { value: "taobao", label: "淘宝" },
  { value: "pinduoduo", label: "拼多多" },
  { value: "douyin", label: "抖音电商" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "amazon", label: "Amazon" },
  { value: "shopee", label: "Shopee" },
];

const purposeOptions = [
  { value: "main", label: "商品主图" },
  { value: "detail", label: "详情页图片" },
  { value: "ad", label: "广告素材" },
  { value: "social", label: "社交媒体封面" },
];

const styleOptions = [
  { value: "minimal", label: "极简高级" },
  { value: "tech", label: "科技产品" },
  { value: "lifestyle", label: "生活场景" },
  { value: "trendy", label: "潮流时尚" },
  { value: "brand", label: "品牌广告" },
];

type ImageFormProps = {
  error: string;
  isLoading: boolean;
  onRegenerate?: () => void;
  onSubmit: (data: ImageGenerationFormData) => void;
  resultImageUrl?: string;
};

export function ImageForm({ error, isLoading, onRegenerate, onSubmit, resultImageUrl }: ImageFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onSubmit({
      product: String(formData.get("product") || ""),
      platform: String(formData.get("platform") || platformOptions[0].value),
      purpose: String(formData.get("purpose") || purposeOptions[0].value),
      style: String(formData.get("style") || styleOptions[0].value),
    });
  }

  return (
    <form className="image-generation-form" onSubmit={handleSubmit}>
      <label>
        商品名称
        <input name="product" placeholder="例如：无线蓝牙耳机" required type="text" />
      </label>
      <label>
        销售平台
        <select name="platform" defaultValue={platformOptions[0].value}>
          {platformOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        图片用途
        <select name="purpose" defaultValue={purposeOptions[0].value}>
          {purposeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        图片风格
        <select name="style" defaultValue={styleOptions[0].value}>
          {styleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button className="button primary" disabled={isLoading} type="submit">
        {isLoading ? (
          <>
            <LongGenerationLoading size="sm" />
            正在生成图片...
          </>
        ) : (
          "生成电商图片"
        )}
      </button>
      {resultImageUrl && onRegenerate ? (
        <button className="button secondary" disabled={isLoading} type="button" onClick={onRegenerate}>
          重新生成
        </button>
      ) : null}
      <p className="image-generation-helper">
        {isLoading ? "CloudAI 正在生成电商视觉，请保持页面打开。" : "系统会自动生成适合平台和用途的电商视觉 Prompt。"}
      </p>
      <p className="image-generation-error" aria-live="polite">
        {error || "错误提示将在这里显示。"}
      </p>
    </form>
  );
}
