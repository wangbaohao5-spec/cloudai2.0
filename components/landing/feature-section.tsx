import Link from "next/link";

const workflowSteps = [
  {
    title: "上传商品图",
    description: "上传一张清晰的商品图，建立当前商品。",
  },
  {
    title: "分析并确认卖点",
    description: "检查分析结果，补充真实信息和生成要求。",
  },
  {
    title: "生成文案与图片",
    description: "围绕商品制作上架文案和视觉内容。",
  },
  {
    title: "整理商品素材",
    description: "在素材库集中查看结果，随时回来继续。",
  },
];

const capabilities = [
  {
    marker: "商品理解",
    title: "先理解商品，再开始生成",
    description: "Vahoro 会整理商品信息、可见特征和卖点方向。你可以在生成前确认内容，减少错误信息继续扩散。",
    details: ["商品分析", "卖点确认", "生成要求"],
  },
  {
    marker: "内容制作",
    title: "文案和图片围绕同一商品展开",
    description: "上架文案、原图优化、商品套图与详情页共享商品上下文，不必在多个工具之间重复说明。",
    details: ["上架文案", "原图优化", "套图与详情页"],
  },
  {
    marker: "持续整理",
    title: "按商品归档，之后还能继续",
    description: "生成结果进入当前商品的素材库与素材包，方便回看、下载和继续补充，而不是散落在临时会话里。",
    details: ["素材库", "素材包", "历史记录"],
  },
];

const workspaceNarrative = [
  {
    marker: "01",
    title: "建立商品上下文",
    description: "商品图片、分析结果、发布目标和生成要求围绕当前商品保留，先确认事实，再继续创作。",
  },
  {
    marker: "02",
    title: "持续生产内容",
    description: "上架文案、原图优化、商品套图与详情页共享同一上下文，不需要在孤立工具里重新说明。",
  },
  {
    marker: "03",
    title: "整理并继续使用",
    description: "结果进入素材库、素材包和历史记录，之后回来时仍能沿着同一个商品继续补充。",
  },
];

const workspaceAreas = [
  { label: "商品策划", state: "1" },
  { label: "素材库", state: "3" },
  { label: "上架文案", state: "2" },
  { label: "原图优化", state: "2" },
  { label: "商品套图", state: "2" },
  { label: "素材包", state: "3" },
];

interface FeatureSectionProps {
  isAuthenticated: boolean;
}

export function FeatureSection({ isAuthenticated }: FeatureSectionProps) {
  return (
    <>
      <section id="workflow" className="landing-section landing-workflow" aria-labelledby="workflow-title">
        <div className="landing-shell">
          <header className="landing-section-heading landing-section-heading-split" data-landing-reveal="section">
            <h2 id="workflow-title">一条清楚的商品内容流程</h2>
            <p>网站只讲四个用户动作。进入工作台后，再按当前商品逐步完成具体内容。</p>
          </header>
          <ol className="landing-workflow-list" data-landing-reveal="workflow">
            {workflowSteps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="product" className="landing-section landing-capabilities" aria-labelledby="capabilities-title">
        <div className="landing-shell">
          <header className="landing-section-heading" data-landing-reveal="section">
            <p className="landing-kicker">产品能力</p>
            <h2 id="capabilities-title">不是工具墙，是围绕商品持续创作</h2>
            <p>从确认商品事实到整理交付素材，每一步都留在同一条商品上下文里。</p>
          </header>
          <div className="landing-capability-list" data-landing-reveal="capabilities">
            {capabilities.map((capability, index) => (
              <article className={index === 0 ? "landing-capability-featured" : undefined} key={capability.title}>
                <span>{capability.marker}</span>
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
                <ul aria-label={`${capability.title}包含的能力`}>
                  {capability.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-workspace" aria-labelledby="workspace-title">
        <div className="landing-shell landing-workspace-layout">
          <div className="landing-workspace-copy" data-landing-reveal="section">
            <h2 id="workspace-title">同一个商品，回来还能接着做</h2>
            <p>当前商品会保留分析、生成要求和已完成素材。你可以先做文案，之后再补图片或详情页，不需要重新开始。</p>
            <div className="landing-workspace-narrative">
              {workspaceNarrative.map((item, index) => (
                <article
                  className="landing-workspace-step"
                  data-landing-workspace-step={index + 1}
                  id={`workspace-state-${index + 1}`}
                  key={item.title}
                >
                  <span aria-hidden="true">{item.marker}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="landing-quick-tools-note">一次性任务也可以使用快速工具处理文案、图片精修或创作建议。</p>
          </div>

          <figure
            className="landing-workspace-structure"
            aria-labelledby="workspace-structure-caption"
            data-landing-reveal="section"
            data-landing-workspace-state="1"
            data-landing-workspace-visual
          >
            <figcaption id="workspace-structure-caption">工作区结构说明</figcaption>
            <div className="landing-workspace-context" data-workspace-region="1">
              <span>当前商品</span>
              <strong>商品信息与生成要求</strong>
            </div>
            <div className="landing-workspace-areas">
              {workspaceAreas.map((area) => (
                <span data-workspace-region={area.state} key={area.label}>
                  {area.label}
                </span>
              ))}
            </div>
            <small>结构示意，不是商品生成结果截图。</small>
          </figure>
        </div>
      </section>

      <section className="landing-section landing-assets" aria-labelledby="assets-title">
        <div className="landing-shell landing-assets-layout">
          <div data-landing-reveal="section">
            <p className="landing-kicker">素材整理</p>
            <h2 id="assets-title">生成之后，内容仍然属于这个商品</h2>
          </div>
          <div className="landing-assets-copy">
            <p data-landing-reveal="section">图片与文案不会散落在不同工具里。素材库负责集中查看，素材包帮助你把同一商品的内容整理到一起。</p>
            <dl data-landing-reveal="assets">
              <div>
                <dt>素材库</dt>
                <dd>查看原图、优化图、套图与详情页结果</dd>
              </div>
              <div>
                <dt>素材包</dt>
                <dd>汇总当前商品的文案与图片，方便继续使用</dd>
              </div>
              <div>
                <dt>历史记录</dt>
                <dd>回到已完成任务，重新打开需要的内容</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="beta" className="landing-section landing-beta" aria-labelledby="beta-title">
        <div className="landing-shell landing-beta-inner">
          <div>
            <h2 id="beta-title">用一个真实商品，完成第一条工作流</h2>
            <p>Vahoro 目前仅向受邀用户开放。已有内测账号，可以直接进入商品工作台。</p>
          </div>
          <div className="landing-beta-actions">
            <Link className="landing-button landing-button-primary" href="/dashboard/products">
              进入工作台
            </Link>
            {!isAuthenticated ? (
              <Link className="landing-text-link" href="/login">
                使用内测账号登录
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
