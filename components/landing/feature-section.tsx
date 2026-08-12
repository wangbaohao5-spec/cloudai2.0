import Link from "next/link";

const workflowSteps = [
  {
    title: "上传商品图",
    description: "上传商品原图，作为所有创作的起点。",
  },
  {
    title: "AI 分析商品",
    description: "识别商品类别、目标用户、核心卖点和适合的内容方向。",
  },
  {
    title: "生成文案与视觉素材",
    description: "生成商品标题、卖点描述、图片优化结果和营销场景图。",
  },
  {
    title: "整理素材包",
    description: "将分析、文案和图片结果整理为可复制、可下载的商品素材包。",
  },
];

const capabilities = [
  {
    title: "商品分析",
    description: "识别商品类别、目标用户、核心卖点，为后续创作提供上下文。",
  },
  {
    title: "商品文案",
    description: "生成标题、卖点、详情描述和短视频脚本，减少重复写作。",
  },
  {
    title: "图片优化",
    description: "基于商品原图优化展示效果，保持商品主体一致。",
  },
  {
    title: "营销场景图",
    description: "围绕商品生成适合推广和展示的场景图片。",
  },
  {
    title: "素材包整理",
    description: "将分析、文案和图片整理成 Markdown 商品素材包，方便复制和下载。",
  },
];

const outputItems = ["标题文案", "核心卖点", "图片优化", "场景图", "Markdown 素材包"];

export function FeatureSection() {
  return (
    <>
      <section id="workflow" className="section showcase landing-workflow">
        <div className="section-heading">
          <p className="eyebrow">Workflow</p>
          <h2>从商品图到完整素材包</h2>
          <p>把原本分散的分析、文案、图片和整理工作串成一条清晰流程。</p>
        </div>
        <div className="landing-workflow-grid">
          {workflowSteps.map((step, index) => (
            <article className="landing-workflow-card" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="capabilities" className="section landing-capabilities">
        <div className="section-heading">
          <p className="eyebrow">Capabilities</p>
          <h2>围绕商品创作的完整能力</h2>
          <p>CloudAI 将商品上下文贯穿分析、文案、图片和素材整理，让每一步输出都围绕同一个商品展开。</p>
        </div>
        <div className="landing-capability-grid">
          {capabilities.map((capability) => (
            <article className="landing-capability-card" key={capability.title}>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="example" className="section landing-example">
        <div className="section-heading">
          <p className="eyebrow">Example</p>
          <h2>看看一个商品如何变成素材包</h2>
          <p>这是一个静态示例，展示商品工作台如何把原图、分析和生成结果组织到一起。</p>
        </div>
        <div className="landing-example-grid">
          <article className="landing-example-card">
            <span>商品原图</span>
            <div className="landing-example-product">
              <strong>Freeplus 温和洁面乳</strong>
              <p>低刺激洁面 · 敏感肌友好</p>
            </div>
          </article>
          <article className="landing-example-card">
            <span>AI 分析摘要</span>
            <h3>温和、保湿、日常复购</h3>
            <p>适合关注成分安全、清洁力适中和长期肤感稳定的年轻通勤用户。</p>
          </article>
          <article className="landing-example-card landing-example-output">
            <span>输出内容</span>
            <div>
              {outputItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section landing-final-cta">
        <div className="about-card">
          <p className="eyebrow">Start</p>
          <h2>准备创建你的第一个商品素材包了吗？</h2>
          <p>进入 CloudAI 工作台，上传商品图开始创作。</p>
          <div className="hero-actions">
            <Link className="button primary" href="/dashboard">
              进入工作台
            </Link>
            <Link className="button secondary" href="/dashboard/products">
              开始创作
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
