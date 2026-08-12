import Link from "next/link";

export function HeroSection() {
  return (
    <section id="hero" className="hero section">
      <div className="hero-content">
        <p className="eyebrow">面向电商团队的 AI 商品创作工作台</p>
        <h1>用 CloudAI 更快完成商品分析、文案与视觉素材</h1>
        <p className="hero-description">
          CloudAI 将商品分析、文案生成、原图优化和营销场景图整合到一个工作台，帮助运营团队从商品图快速推进到可发布素材。
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/dashboard">
            进入工作台
          </Link>
          <Link className="button secondary" href="/dashboard/products">
            创建商品素材
          </Link>
        </div>
      </div>
      <div className="hero-panel" aria-label="CloudAI 工作台预览">
        <div className="panel-header">
          <span />
          <span />
          <span />
        </div>
        <div className="panel-card highlighted">
          <p>AI 正在整理商品卖点...</p>
          <strong>从商品图到完整营销素材</strong>
        </div>
        <div className="panel-grid">
          <div>
            商品分析
            <br />
            <strong>已完成</strong>
          </div>
          <div>
            素材生成
            <br />
            <strong>24 张</strong>
          </div>
          <div>
            节省时间
            <br />
            <strong>6.5h</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
