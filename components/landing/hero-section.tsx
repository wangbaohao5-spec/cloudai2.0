import Link from "next/link";

const workflowStatus = [
  { label: "AI 分析", value: "完成" },
  { label: "文案", value: "3 条" },
  { label: "详情页", value: "2 张" },
  { label: "套图", value: "5 张" },
  { label: "素材库", value: "已生成" },
];

export function HeroSection() {
  return (
    <section id="hero" className="hero section">
      <div className="hero-content">
        <p className="eyebrow">AI 电商商品创作工作台</p>
        <h1>一张商品图，生成整套电商素材</h1>
        <p className="hero-description">
          上传商品图片后，CloudAI 会帮你完成商品分析、卖点文案、详情页图片、场景图、商品套图和素材库，让商品内容从上传到交付形成完整工作流。
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/dashboard/products">
            进入工作台
          </Link>
          <Link className="button secondary" href="#showcase">
            查看生成示例
          </Link>
        </div>
      </div>

      <div className="hero-panel hero-workflow-preview" aria-label="商品工作流模拟面板">
        <div className="panel-header">
          <span />
          <span />
          <span />
        </div>

        <div className="hero-product-card">
          <div className="hero-product-image">
            <span>Product</span>
          </div>
          <div>
            <p className="eyebrow">当前商品</p>
            <h2>Freeplus 温和洁面乳</h2>
            <p>温和清洁 · 保留瓶型包装 · 详情页素材生成中</p>
          </div>
        </div>

        <div className="hero-analysis-card">
          <strong>AI 分析完成</strong>
          <p>已整理商品类别、目标用户、核心卖点、材质质感和后续生成需要保留的包装细节。</p>
        </div>

        <div className="hero-workflow-status">
          {workflowStatus.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
