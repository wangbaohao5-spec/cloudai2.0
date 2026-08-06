import { outputTypeOptions, platformOptions, productGoalOptions, toneOptions } from "@/lib/copywriting-options";
import type { CopywritingFormData } from "@/lib/types";

type CopywritingFormProps = {
  error: string;
  isLoading: boolean;
  onSubmit: (data: CopywritingFormData) => void;
};

export function CopywritingForm({ error, isLoading, onSubmit }: CopywritingFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const outputTypes = formData.getAll("outputTypes").map(String);
    const generationMode = formData.get("generationMode") === "marketing-plan" ? "marketing-plan" : "single";

    onSubmit({
      productName: String(formData.get("productName") || ""),
      productType: String(formData.get("productType") || ""),
      sellingPoints: String(formData.get("sellingPoints") || ""),
      platform: String(formData.get("platform") || ""),
      tone: String(formData.get("tone") || ""),
      outputType: generationMode === "marketing-plan" ? "marketing-plan" : outputTypes[0] || outputTypeOptions[0].value,
      goal: String(formData.get("goal") || ""),
      outputTypes,
      generationMode,
    });
  }

  return (
    <form className="copywriting-form" onSubmit={handleSubmit}>
      <label>
        商品名称
        <input name="productName" placeholder="例如：智能恒温咖啡杯" required type="text" />
      </label>
      <label>
        商品类型
        <input name="productType" placeholder="例如：家居数码 / 办公用品" required type="text" />
      </label>
      <label>
        核心卖点
        <textarea name="sellingPoints" placeholder="例如：保温 8 小时、无线充电、适合办公室和通勤" required rows={5} />
      </label>
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
        文案风格
        <select name="tone" defaultValue={toneOptions[0].value}>
          {toneOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        商品目标
        <select name="goal" defaultValue={productGoalOptions[0].value}>
          {productGoalOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        一键模式
        <select name="generationMode" defaultValue="single">
          <option value="single">按选择内容生成</option>
          <option value="marketing-plan">一键生成营销方案</option>
        </select>
      </label>
      <fieldset className="copywriting-checkbox-group">
        <legend>生成内容</legend>
        <div className="copywriting-checkbox-grid">
          {outputTypeOptions.map((option) => (
            <label key={option.value}>
              <input defaultChecked={option.value === outputTypeOptions[0].value} name="outputTypes" type="checkbox" value={option.value} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="button primary" disabled={isLoading} type="submit">
        {isLoading ? "生成中..." : "生成商品文案"}
      </button>
      <p className="copywriting-helper">{isLoading ? "CloudAI 正在生成 AI 文案..." : "Loading 状态将在这里显示。"}</p>
      <p className="copywriting-error" aria-live="polite">{error || "错误提示将在这里显示。"}</p>
    </form>
  );
}
