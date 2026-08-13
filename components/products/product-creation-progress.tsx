"use client";

type ProductCreationProgressProps = {
  copywritingCount: number;
  imageEditCount: number;
  sceneImageCount: number;
};

type ProgressItem = {
  id: string;
  label: string;
  count: number;
  done: boolean;
  status: string;
  description: string;
};

function buildProgressItems({ copywritingCount, imageEditCount, sceneImageCount }: ProductCreationProgressProps): ProgressItem[] {
  return [
    {
      id: "analysis",
      label: "商品分析",
      count: 1,
      done: true,
      status: "已完成",
      description: "已识别商品类别、目标用户和核心卖点",
    },
    {
      id: "copywriting",
      label: "文案",
      count: copywritingCount,
      done: copywritingCount > 0,
      status: copywritingCount > 0 ? `已生成 ${copywritingCount} 条` : "待生成",
      description: copywritingCount > 0 ? "标题、卖点和营销描述已进入素材包" : "在文案 Tab 生成商品标题、卖点和详情描述",
    },
    {
      id: "images",
      label: "图片",
      count: imageEditCount,
      done: imageEditCount > 0,
      status: imageEditCount > 0 ? `已生成 ${imageEditCount} 张` : "待生成",
      description: imageEditCount > 0 ? "原图优化结果已可用于素材整理" : "在图片 Tab 生成商品展示优化图",
    },
    {
      id: "scenes",
      label: "场景图",
      count: sceneImageCount,
      done: sceneImageCount > 0,
      status: sceneImageCount > 0 ? `已生成 ${sceneImageCount} 张` : "待生成",
      description: sceneImageCount > 0 ? "营销场景图已进入当前商品资产" : "在场景 Tab 生成适合推广的营销场景图",
    },
  ];
}

export function ProductCreationProgress({ copywritingCount, imageEditCount, sceneImageCount }: ProductCreationProgressProps) {
  const progressItems = buildProgressItems({ copywritingCount, imageEditCount, sceneImageCount });
  const completedCount = progressItems.filter((item) => item.done).length;
  const totalCount = progressItems.length;

  return (
    <section className="product-creation-progress" aria-label="商品创作进度">
      <div className="product-creation-section-header">
        <div>
          <strong>创作进度</strong>
          <span>围绕当前商品的内容资产</span>
        </div>
        <em className="product-creation-progress-summary">
          已完成 {completedCount}/{totalCount} 个创作环节
        </em>
      </div>

      <div className="product-creation-progress-list">
        {progressItems.map((item, index) => (
          <article className={item.done ? "done" : "pending"} key={item.id}>
            <span aria-hidden="true">{item.done ? "✓" : index + 1}</span>
            <div>
              <div className="product-creation-progress-row">
                <strong>{item.label}</strong>
                <em>{item.status}</em>
              </div>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
