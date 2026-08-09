"use client";

import { PRODUCT_IMAGE_EDIT_GOALS, type ProductImageEditGoalId } from "@/lib/product-image-edit-options";

type ImageEditGoalSelectorProps = {
  value: ProductImageEditGoalId;
  onChange: (goalId: ProductImageEditGoalId) => void;
};

const goalIcons: Record<ProductImageEditGoalId, string> = {
  "main-image": "🛒",
  "detail-image": "📦",
  "xiaohongshu-seeding": "🌿",
  "ad-visual": "🚀",
};

export function ImageEditGoalSelector({ onChange, value }: ImageEditGoalSelectorProps) {
  return (
    <div className="image-edit-goal-selector" role="radiogroup" aria-label="优化目标">
      {PRODUCT_IMAGE_EDIT_GOALS.map((goal) => (
        <label className={value === goal.id ? "active" : ""} key={goal.id}>
          <input checked={value === goal.id} name="goalId" type="radio" value={goal.id} onChange={() => onChange(goal.id)} />
          <span>{goalIcons[goal.id]}</span>
          <strong>{goal.title}</strong>
          <p>{goal.description}</p>
        </label>
      ))}
    </div>
  );
}
