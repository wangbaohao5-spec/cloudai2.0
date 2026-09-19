import Image from "next/image";

const analysisItems = [
  ["商品", "洁面产品"],
  ["包装", "白色软管 / 极简视觉"],
  ["素材判断", "主体完整，背景干扰，暖色偏移，包装边缘分离不足"],
  ["内容方向", "3 个"],
];

const visualDirections = [
  {
    marker: "01",
    title: "Clean Commerce",
    use: "上架主视觉",
    description: "从普通随手拍整理成干净、可信的商品展示资产。",
  },
  {
    marker: "02",
    title: "Fresh Cleansing",
    use: "使用场景",
    description: "将同一商品放进符合洁面品类的日常使用语境。",
  },
  {
    marker: "03",
    title: "Minimal Editorial",
    use: "品牌内容",
    description: "在保持商品身份的同时，延展为更克制的品牌视觉。",
  },
];

const finalAssets = [
  {
    marker: "01",
    title: "Clean Commerce",
    use: "上架可信度",
    src: "/cases/freeplus/freeplus-clean-commerce.png",
    alt: "freeplus mild soap 洗面奶的干净电商主视觉",
  },
  {
    marker: "02",
    title: "Fresh Cleansing",
    use: "场景理解",
    src: "/cases/freeplus/freeplus-cleansing-scene.png",
    alt: "freeplus mild soap 洗面奶置于清爽日常洁面场景",
  },
  {
    marker: "03",
    title: "Minimal Editorial",
    use: "品牌延展",
    src: "/cases/freeplus/freeplus-editorial.png",
    alt: "freeplus mild soap 洗面奶的极简编辑风格视觉",
  },
];

const workspaceContents = [
  "商品分析",
  "Content Brief",
  "上架文案",
  "Clean Commerce asset",
  "Fresh Cleansing asset",
  "Editorial asset",
];

export function RealCaseSection() {
  return (
    <section id="case" className="landing-section landing-real-case" aria-labelledby="real-case-title">
      <div className="landing-shell">
        <header className="landing-real-case-intro" data-landing-reveal="section">
          <p className="landing-kicker">真实商品案例 · freeplus mild soap</p>
          <h2 id="real-case-title">一张普通商品照片，继续成为一套上架内容</h2>
          <p>
            Vahoro 不把商品交给孤立的单次修图。它先理解真实素材，再规划不同用途的内容，并把结果继续留在同一个商品工作区里。
          </p>
        </header>

        <div className="landing-case-source landing-case-block" data-landing-reveal="section">
          <div className="landing-case-copy">
            <span className="landing-case-step">01 / 原始素材</span>
            <h3>真实商品，从普通素材开始</h3>
            <p>一张普通手机随手拍。商品主体完整，但背景、色温和展示感还不适合直接上架。</p>
            <small>真实、常见、可用，但还没有被整理成商业展示素材。</small>
          </div>
          <figure className="landing-case-source-figure">
            <Image
              src="/cases/freeplus/freeplus-source.jpg"
              alt="木纹桌面上手机随手拍摄的 freeplus mild soap 洗面奶"
              width={3024}
              height={4032}
              sizes="(max-width: 720px) 100vw, 42vw"
            />
            <figcaption>输入素材 · 手机随手拍</figcaption>
          </figure>
        </div>

        <div className="landing-case-analysis landing-case-block" data-landing-reveal="section">
          <div className="landing-case-copy">
            <span className="landing-case-step">02 / 商品理解</span>
            <h3>先判断商品和素材，再决定生成什么</h3>
            <p>商品身份、包装特征和素材状态形成内容依据，而不是直接套用一个固定模板。</p>
            <ul className="landing-case-tags" aria-label="建议视觉方向">
              <li>洁面产品</li>
              <li>极简包装</li>
              <li>白色软管</li>
              <li>Clean Commerce</li>
              <li>Fresh Cleansing</li>
              <li>Editorial</li>
            </ul>
          </div>
          <dl className="landing-case-analysis-list">
            {analysisItems.map(([term, description]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="landing-case-directions landing-case-block">
          <header className="landing-case-copy" data-landing-reveal="section">
            <span className="landing-case-step">03 / 内容方向</span>
            <h3>同一个商品，承担三种不同内容职责</h3>
            <p>不是更换三个背景，而是分别解决上架、场景理解与品牌延展。</p>
          </header>
          <ol className="landing-case-direction-list">
            {visualDirections.map((direction) => (
              <li data-landing-reveal="section" key={direction.marker}>
                <span>{direction.marker}</span>
                <div>
                  <p>{direction.use}</p>
                  <h4>{direction.title}</h4>
                  <small>{direction.description}</small>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="landing-case-results landing-case-block">
          <header className="landing-case-copy" data-landing-reveal="section">
            <span className="landing-case-step">04 / 最终视觉资产</span>
            <h3>三张图，三种明确用途</h3>
            <p>商品身份保持一致，构图与环境围绕各自的内容任务展开。</p>
          </header>
          <div className="landing-case-gallery">
            {finalAssets.map((asset) => (
              <figure data-landing-reveal="section" key={asset.marker}>
                <div className="landing-case-image-frame">
                  <Image src={asset.src} alt={asset.alt} width={1122} height={1402} sizes="(max-width: 720px) 100vw, 33vw" />
                </div>
                <figcaption>
                  <span>{asset.marker}</span>
                  <div>
                    <strong>{asset.title}</strong>
                    <small>{asset.use}</small>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="landing-case-workspace landing-case-block" data-landing-reveal="section">
          <div className="landing-case-workspace-copy">
            <span className="landing-case-step">05 / Workspace Result</span>
            <h3>生成结束，商品上下文仍然继续</h3>
            <p>分析、文案和视觉资产，继续保留在同一个商品上下文里。</p>
          </div>
          <div className="landing-case-workspace-panel" aria-label="freeplus mild soap 商品工作区内容概览">
            <div>
              <span>当前 Product</span>
              <strong>freeplus mild soap</strong>
            </div>
            <ul>
              {workspaceContents.map((content) => (
                <li key={content}>{content}</li>
              ))}
            </ul>
            <small>一个商品 · 一条持续的内容工作流</small>
          </div>
        </div>
      </div>
    </section>
  );
}
