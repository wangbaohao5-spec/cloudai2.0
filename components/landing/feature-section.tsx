import Link from "next/link";

const workflowSteps = [
  {
    title: "上传商品图",
    description: "上传商品原图，作为后续分析和生成的基础。",
  },
  {
    title: "AI 分析商品档案",
    description: "识别商品类型、颜色、材质、卖点和必须保留的细节。",
  },
  {
    title: "编辑商品卖点与生成要求",
    description: "把 AI 分析结果整理成可控的商品生成任务书。",
  },
  {
    title: "生成详情页、套图和素材库",
    description: "按不同用途生成可预览、可下载、可导出的商品素材。",
  },
];

const capabilities = [
  {
    title: "商品分析",
    description: "识别商品信息、卖点、颜色、材质和需要保留的细节。",
  },
  {
    title: "商品卖点 & 生成要求",
    description: "把商品分析转成可编辑的生成任务书，减少无效 prompt。",
  },
  {
    title: "详情页生成",
    description: "规划并生成适合商品详情页的卖点图、细节图和购买理由图。",
  },
  {
    title: "商品套图",
    description: "按快速上架、详情页、社媒种草和平台 Listing 生成成套图片。",
  },
  {
    title: "素材库",
    description: "自动汇总原图、优化图、场景图、详情页图和套图素材。",
  },
  {
    title: "额度透明",
    description: "规划阶段不消耗图片额度，生成前显示预计消耗。",
  },
];

const workspaceTabs = ["分析", "素材", "文案", "图片", "场景", "详情页", "套图", "导出"];
const railItems = [
  { label: "商品档案", value: "Freeplus 温和洁面乳" },
  { label: "商品卖点", value: "温和清洁 / 清爽肤感 / 日常复购" },
  { label: "生成要求", value: "保留瓶型、包装、Logo 和容量信息" },
  { label: "创作进度", value: "套图 5 张 · 详情页 2 张" },
];
const showcaseItems = [
  { title: "护肤品详情页", tags: ["详情页", "卖点图"], tone: "skincare" },
  { title: "服装场景图", tags: ["上身展示", "细节图"], tone: "fashion" },
  { title: "首饰套图", tags: ["白底图", "细节图"], tone: "jewelry" },
  { title: "数码外设套图", tags: ["场景图", "核心卖点"], tone: "tech" },
];

export function FeatureSection() {
  return (
    <>
      <section id="workflow" className="section showcase landing-workflow">
        <div className="section-heading">
          <p className="eyebrow">Workflow</p>
          <h2>从一张商品图开始</h2>
          <p>把上传、分析、任务书、生成和交付串成一条清楚的商品内容流程。</p>
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

      <section className="section landing-workspace-preview-section">
        <div className="section-heading">
          <p className="eyebrow">Workspace</p>
          <h2>不是单个 AI 工具，而是商品内容工作台</h2>
          <p>CloudAI 会围绕一个商品持续组织内容：分析、文案、图片、场景、详情页、套图、素材库和导出都在同一个工作流中完成。</p>
        </div>
        <div className="landing-workspace-mock glass-card" aria-label="商品工作台静态预览">
          <aside className="landing-workspace-rail">
            {railItems.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </aside>
          <div className="landing-workspace-panel">
            <div className="landing-workspace-tabs">
              {workspaceTabs.map((tab) => (
                <span className={tab === "套图" ? "active" : ""} key={tab}>
                  {tab}
                </span>
              ))}
            </div>
            <div className="landing-workspace-board">
              <article>
                <span>商品套图 · 5 张</span>
                <strong>详情页套图规划</strong>
                <p>主视觉、核心卖点、使用场景、细节特写和购买理由已经拆成独立任务。</p>
              </article>
              <div className="landing-workspace-assets">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="section landing-capabilities">
        <div className="section-heading">
          <p className="eyebrow">Capabilities</p>
          <h2>为电商商品内容而设计</h2>
          <p>从商品理解到素材交付，每个能力都服务于实际上架、详情页和社媒内容生产。</p>
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

      <section id="showcase" className="section landing-example">
        <div className="section-heading">
          <p className="eyebrow">Showcase</p>
          <h2>生成示例</h2>
          <p>以下为 CloudAI 商品素材生成方向示例，真实效果会根据商品图片、生成要求和模型表现变化。</p>
        </div>
        <div className="landing-showcase-grid">
          {showcaseItems.map((item) => (
            <article className="landing-showcase-card" key={item.title}>
              <div className={`landing-showcase-visual ${item.tone}`} aria-hidden="true">
                <span />
                <i />
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section landing-final-cta">
        <div className="about-card">
          <p className="eyebrow">Start</p>
          <h2>开始为你的第一个商品生成素材</h2>
          <p>进入商品工作台，上传商品图，体验从商品分析到素材交付的完整流程。</p>
          <div className="hero-actions">
            <Link className="button primary" href="/dashboard/products">
              进入商品工作台
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
