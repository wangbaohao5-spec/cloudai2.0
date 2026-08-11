"use client";

const creationActions = [
  {
    href: "#product-copywriting-panel",
    label: "生成商品文案",
    description: "标题、卖点、详情和短视频口播",
  },
  {
    href: "#product-image-edit-panel",
    label: "优化商品原图",
    description: "主图、详情图、种草图和广告视觉",
  },
  {
    href: "#product-scene-image-panel",
    label: "生成营销场景图",
    description: "基于真实商品生成投放场景素材",
  },
];

export function ProductCreationActions() {
  return (
    <section className="product-creation-action-panel" aria-label="继续创作">
      <div className="product-creation-section-header">
        <strong>继续创作</strong>
        <span>选择下一步，跳转到下方现有生成模块</span>
      </div>
      <div className="product-creation-action-grid">
        {creationActions.map((action) => (
          <a href={action.href} key={action.href}>
            <strong>{action.label}</strong>
            <span>{action.description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
