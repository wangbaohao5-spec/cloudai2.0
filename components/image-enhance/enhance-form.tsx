import type { ImageEnhanceInput } from "@/lib/ai/image-enhance-provider";

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
  { value: "detail", label: "详情页" },
  { value: "ad", label: "广告素材" },
  { value: "social", label: "社交媒体" },
];

const styleOptions = [
  { value: "minimal", label: "极简高级" },
  { value: "commercial", label: "商业摄影" },
  { value: "lifestyle", label: "生活场景" },
  { value: "brand", label: "品牌广告" },
];

type EnhanceFormProps = {
  disabled: boolean;
  fileName: string;
  imagePreviewUrl: string;
  onSubmit: (data: ImageEnhanceInput) => void;
};

export function EnhanceForm({ disabled, fileName, imagePreviewUrl, onSubmit }: EnhanceFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onSubmit({
      fileName,
      imagePreviewUrl,
      platform: String(formData.get("platform") || platformOptions[0].value),
      purpose: String(formData.get("purpose") || purposeOptions[0].value),
      style: String(formData.get("style") || styleOptions[0].value),
    });
  }

  return (
    <form className="image-enhance-form" onSubmit={handleSubmit}>
      <label>
        平台
        <select name="platform" defaultValue={platformOptions[0].value}>
          {platformOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        用途
        <select name="purpose" defaultValue={purposeOptions[0].value}>
          {purposeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        风格
        <select name="style" defaultValue={styleOptions[0].value}>
          {styleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button className="button primary" disabled={disabled || !imagePreviewUrl} type="submit">
        {disabled ? "优化中..." : "开始优化"}
      </button>
    </form>
  );
}
