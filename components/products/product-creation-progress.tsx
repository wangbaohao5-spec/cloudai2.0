"use client";

type ProductCreationProgressProps = {
  copywritingCount: number;
  detailPageCount: number;
  imageEditCount: number;
  imageSetCount: number;
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

function buildProgressItems({ copywritingCount, detailPageCount, imageEditCount, imageSetCount, sceneImageCount }: ProductCreationProgressProps): ProgressItem[] {
  const generatedVisualCount = imageEditCount + imageSetCount + sceneImageCount + detailPageCount;

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
      id: "image-set",
      label: "套图",
      count: imageSetCount,
      done: imageSetCount > 0,
      status: imageSetCount > 0 ? `已生成 ${imageSetCount} 张` : "待生成",
      description: imageSetCount > 0 ? "商品套图图片已进入素材区" : "在套图 Tab 基于规划生成商品套图",
    },
    {
      id: "assets",
      label: "素材",
      count: generatedVisualCount,
      done: generatedVisualCount > 0,
      status: generatedVisualCount > 0 ? `已汇总 ${generatedVisualCount} 张` : "待汇总",
      description: generatedVisualCount > 0 ? "图片、套图以及历史场景图/详情页图会统一展示" : "生成图片或套图后，素材会自动进入素材库",
    },
    {
      id: "export",
      label: "导出",
      count: 0,
      done: copywritingCount > 0 || generatedVisualCount > 0,
      status: copywritingCount > 0 || generatedVisualCount > 0 ? "可整理" : "待生成内容",
      description: "在导出 Tab 复制或下载当前商品素材包",
    },
  ];
}

export function ProductCreationProgress({ copywritingCount, detailPageCount, imageEditCount, imageSetCount, sceneImageCount }: ProductCreationProgressProps) {
  const progressItems = buildProgressItems({ copywritingCount, detailPageCount, imageEditCount, imageSetCount, sceneImageCount });
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
