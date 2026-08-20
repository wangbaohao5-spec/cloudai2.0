"use client";

type ProductCreationActionsProps = {
  analysisHistoryId?: string;
};

const creationActions = [
  {
    tab: "copywriting",
    label: "生成上架文案",
    description: "标题、卖点和商品描述",
  },
  {
    tab: "image",
    label: "精修商品原图",
    description: "生成更适合电商展示的商品图",
  },
  {
    tab: "image-set",
    label: "生成商品套图",
    description: "规划并生成一组商品素材",
  },
];

function getWorkspaceActionHref(analysisHistoryId: string | undefined, tab: string) {
  const params = new URLSearchParams();

  if (analysisHistoryId) {
    params.set("analysis", analysisHistoryId);
  }

  params.set("tab", tab);

  return `/dashboard/products?${params.toString()}`;
}

export function ProductCreationActions({ analysisHistoryId }: ProductCreationActionsProps) {
  return (
    <section className="product-creation-action-panel" aria-label="继续创作">
      <div className="product-creation-section-header">
        <strong>继续创作</strong>
        <span>选择下一步，继续完善当前商品内容资产</span>
      </div>
      <div className="product-creation-action-grid">
        {creationActions.map((action) => (
          <a href={getWorkspaceActionHref(analysisHistoryId, action.tab)} key={action.tab}>
            <strong>{action.label}</strong>
            <span>{action.description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
