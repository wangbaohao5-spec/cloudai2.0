import Link from "next/link";

export function HeroSection() {
  return (
    <section id="hero" className="hero section">
      <div className="hero-content">
        <p className="eyebrow">面向下一代团队的 AI 创作云</p>
        <h1>用 CloudAI 更快完成文案、视觉与创意工作</h1>
        <p className="hero-description">
          CloudAI 将智能文案生成、AI 图片创作和高效协作整合到一个简洁平台，帮助团队从灵感到交付都快人一步。
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/dashboard/copywriting">
            开始生成文案
          </Link>
          <a className="button secondary" href="#contact">
            预约演示
          </a>
        </div>
      </div>
      <div className="hero-panel" aria-label="CloudAI 工作台预览">
        <div className="panel-header">
          <span />
          <span />
          <span />
        </div>
        <div className="panel-card highlighted">
          <p>AI 正在生成营销标题...</p>
          <strong>“让创意在云端自动生长”</strong>
        </div>
        <div className="panel-grid">
          <div>
            文案评分
            <br />
            <strong>98%</strong>
          </div>
          <div>
            图片草稿
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
