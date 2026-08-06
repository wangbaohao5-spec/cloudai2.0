const features = [
  {
    icon: "✨",
    title: "智能创意生成",
    description: "覆盖标题、长文、图片创意等基础内容生产场景。",
  },
  {
    icon: "⚡",
    title: "快速工作流",
    description: "从输入需求到输出草稿，只需几步即可完成基础创作。",
  },
  {
    icon: "🔒",
    title: "安全云端体验",
    description: "简洁可靠的云端界面，适合团队探索 AI 工具落地。",
  },
];

export function FeatureSection() {
  return (
    <>
      <section id="features" className="section showcase features">
        <div className="section-heading">
          <p className="eyebrow">Features</p>
          <h2>产品功能介绍</h2>
          <p>CloudAI 聚焦基础 AI 创作框架，让团队用简单页面快速理解核心能力。</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="section about">
        <div className="about-card">
          <p className="eyebrow">About CloudAI</p>
          <h2>一个面向创作者与团队的 AI 工具平台基础版</h2>
          <p>
            CloudAI 以轻量、清晰、现代的官网框架展示 AI 文案与 AI 图片生成能力。当前版本只使用 HTML、CSS 和 JavaScript 构建，不包含后端服务或 API 接入，适合作为产品展示页的起点。
          </p>
        </div>
      </section>
    </>
  );
}
