import Link from "next/link";

const workflowStatus = [
  { label: "商品分析", value: "已完成" },
  { label: "商品文案", value: "3 条" },
  { label: "图片优化", value: "2 张" },
  { label: "场景图", value: "4 张" },
  { label: "素材包", value: "已整理" },
];

export function HeroSection() {
  return (
    <section id="hero" className="hero section">
      <div className="hero-content">
        <p className="eyebrow">面向电商创作者的 AI 商品工作台</p>
        <h1>一张商品图，生成完整电商营销素材</h1>
        <p className="hero-description">
          上传商品图片，CloudAI 会帮你完成商品分析、营销文案、图片优化、场景图生成，并整理成可复制、可下载的素材包。
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/dashboard">
            进入工作台
          </Link>
          <Link className="button secondary" href="/dashboard/products">
            开始创作商品素材
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
            <p>敏感肌日常清洁 · 温和保湿 · 通勤与旅行场景</p>
          </div>
        </div>

        <div className="hero-analysis-card">
          <strong>AI 分析摘要</strong>
          <p>定位为低刺激洁面产品，适合关注成分温和、肤感清爽和日常复购的用户。</p>
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
