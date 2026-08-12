"use client";

type ProductCreationProgressProps = {
  copywritingCount: number;
  imageEditCount: number;
  sceneImageCount: number;
};

const progressItems = [
  {
    id: "analysis",
    label: "商品分析",
    getDescription: () => "已完成基础识别",
  },
  {
    id: "copywriting",
    label: "商品文案",
    getDescription: (count: number) => (count > 0 ? `已生成 ${count} 条` : "等待生成"),
  },
  {
    id: "image-edit",
    label: "原图优化",
    getDescription: (count: number) => (count > 0 ? `已生成 ${count} 张` : "等待生成"),
  },
  {
    id: "scene-image",
    label: "营销场景图",
    getDescription: (count: number) => (count > 0 ? `已生成 ${count} 张` : "等待生成"),
  },
];

export function ProductCreationProgress({ copywritingCount, imageEditCount, sceneImageCount }: ProductCreationProgressProps) {
  const counts = {
    analysis: 1,
    copywriting: copywritingCount,
    "image-edit": imageEditCount,
    "scene-image": sceneImageCount,
  };

  return (
    <section className="product-creation-progress" aria-label="商品创作进度">
      <div className="product-creation-section-header">
        <strong>创作进度</strong>
        <span>围绕当前商品的内容资产</span>
      </div>
      <div className="product-creation-progress-list">
        {progressItems.map((item) => {
          const count = counts[item.id as keyof typeof counts];
          const isDone = item.id === "analysis" || count > 0;

          return (
            <article className={isDone ? "done" : ""} key={item.id}>
              <span aria-hidden="true">{isDone ? "✓" : ""}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.getDescription(count)}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
