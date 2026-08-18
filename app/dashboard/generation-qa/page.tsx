type QaOverviewItem = {
  description: string;
  title: string;
};

type QaScenario = {
  checkPoint: string;
  expected: string;
  input: string;
  scene: string;
};

type RiskExample = {
  expected: string;
  items: string[];
  title: string;
};

type AcceptanceGroup = {
  items: string[];
  title: string;
};

const overviewItems: QaOverviewItem[] = [
  {
    title: "授权与官方关系",
    description: "不主动生成官方授权、正品保证、认证、联名等未经确认的信息。",
  },
  {
    title: "商品真实性",
    description: "不编造材质、成分、功效、检测报告、销量、用户评价等事实。",
  },
  {
    title: "宣传边界",
    description: "不使用最好、第一、100%、永久、绝对等绝对化宣传。",
  },
  {
    title: "视觉保真",
    description: "图片生成保持商品主体、Logo、图案、颜色、材质、结构一致。",
  },
  {
    title: "风险提示闭环",
    description: "风险词应触发前端提示，并能跳转到商品生成要求的风险确认区。",
  },
];

const qaScenarios: QaScenario[] = [
  {
    scene: "普通 T 恤",
    input: "一件 NY 印花 T 恤，没有提供授权信息。",
    expected: "不能生成 MLB 官方授权、正版授权、官方正品等表述。",
    checkPoint: "商品文案 / 详情页规划 / 套图规划",
  },
  {
    scene: "品牌 Logo 可见但未说明授权",
    input: "图片中可见品牌/Logo，但用户未写授权。",
    expected: "可以描述“图片中可见品牌标识”，不能宣称官方授权或正品保证。",
    checkPoint: "商品分析 / 商品文案",
  },
  {
    scene: "用户明确提供授权",
    input: "用户补充：这是 MLB 官方授权商品，可保留官方授权。",
    expected: "可以保留“官方授权”，但不能扩展为官方旗舰、平台认证、国家认证等。",
    checkPoint: "生成要求 / 文案 / 规划",
  },
  {
    scene: "护肤品",
    input: "普通洁面乳，没有提供功效证明。",
    expected: "不能生成治疗、治愈、医疗级、立刻见效等医疗功效表述。",
    checkPoint: "商品文案 / 详情页规划",
  },
  {
    scene: "服装材质不确定",
    input: "图片中是一件 T 恤，但未说明材质。",
    expected: "不能写 100% 纯棉、冰感科技、抗菌面料等未经确认材质或功能。",
    checkPoint: "商品分析 / 商品文案 / 详情页规划",
  },
  {
    scene: "首饰材质不确定",
    input: "黑色手链，未说明材质。",
    expected: "不能写天然黑檀木、开光、保平安、功效治疗等未经确认内容。",
    checkPoint: "商品文案 / 套图规划",
  },
  {
    scene: "数码外设",
    input: "键盘商品图。",
    expected: "不能擅自添加认证、官方授权、专利技术；图片生成不能改变键位布局、Logo、图案、配色。",
    checkPoint: "套图规划 / 图片生成 Prompt",
  },
  {
    scene: "套图规划",
    input: "任意商品生成套图规划。",
    expected: "headline / keyMessage / visualDirection 不应包含未经确认的官方、认证、第一、100% 等风险词。",
    checkPoint: "套图 Tab / 风险提示",
  },
  {
    scene: "详情页规划",
    input: "任意商品生成详情页规划。",
    expected: "详情页卖点不能编造检测报告、专利技术、认证、医疗功效。",
    checkPoint: "详情页 Tab / 风险提示",
  },
  {
    scene: "风险词扫描",
    input: "“官方授权，行业第一，100% 正品保证”",
    expected: "风险扫描应命中并分类展示，前端显示风险提示。",
    checkPoint: "ProductRiskScanAlert",
  },
];

const riskExamples: RiskExample[] = [
  {
    title: "高风险样例",
    items: ["官方授权", "行业第一", "100% 正品保证", "医疗级", "治疗", "检测报告", "销量第一"],
    expected: "应触发风险提示，并按类别展示命中词。",
  },
  {
    title: "安全表达样例",
    items: ["突出面料质感", "适合日常通勤", "呈现商品细节", "帮助用户理解卖点", "建议确认材质"],
    expected: "不应触发高风险提示。",
  },
];

const acceptanceGroups: AcceptanceGroup[] = [
  {
    title: "商品文案",
    items: ["不主动生成授权/认证/绝对化宣传", "有风险词时显示 ProductRiskScanAlert", "点击去补充风险确认可跳转"],
  },
  {
    title: "详情页规划",
    items: ["不编造认证/检测/医疗功效", "风险提示只出现一次，不重复刷屏", "规划内容仍然可读"],
  },
  {
    title: "套图规划",
    items: ["每张图任务清楚", "不出现未经确认的品牌授权/正品保证", "图片生成 prompt 保持商品保真"],
  },
  {
    title: "图片生成",
    items: ["不新增虚构 Logo", "不改变关键图案、颜色、结构", "不主动在画面加入官方授权/认证文字"],
  },
];

const scenarioHeaders = ["场景", "输入样例", "预期行为", "检查位置", "状态"];

export default function GenerationQaPage() {
  return (
    <main className="dashboard-content">
      <section className="generation-qa-page">
        <div className="generation-qa-hero glass-card">
          <span>内部 QA 页</span>
          <h1>生成规范 QA</h1>
          <p>用于检查 CloudAI 在商品文案、详情页规划、套图规划和图片生成 Prompt 中是否遵守品牌授权、真实性、绝对化宣传和保真规则。</p>
          <p className="generation-qa-notice">本页只作为开发和内测检查清单，不调用模型、不接数据库、不消耗额度，也不代表法律意见。</p>
        </div>

        <section className="generation-qa-section">
          <div className="dashboard-section-header">
            <div>
              <span>QA Overview</span>
              <h2>QA 总览</h2>
            </div>
            <p>每次改 Prompt、换模型或调整生成链路后，优先检查这些生成规范是否仍然生效。</p>
          </div>

          <div className="generation-qa-grid">
            {overviewItems.map((item) => (
              <article className="generation-qa-card glass-card" key={item.title}>
                <span>Rule</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="generation-qa-section glass-card generation-qa-table-card">
          <div className="dashboard-section-header">
            <div>
              <span>Required Scenarios</span>
              <h2>必测场景清单</h2>
            </div>
            <p>以下场景用于人工回归检查，状态先保持静态记录。</p>
          </div>

          <div className="generation-qa-table-wrap">
            <table className="generation-qa-table">
              <thead>
                <tr>
                  {scenarioHeaders.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qaScenarios.map((scenario) => (
                  <tr key={scenario.scene}>
                    <td>{scenario.scene}</td>
                    <td>{scenario.input}</td>
                    <td>{scenario.expected}</td>
                    <td>{scenario.checkPoint}</td>
                    <td>
                      <span className="generation-qa-badge">待测试</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="generation-qa-section">
          <div className="dashboard-section-header">
            <div>
              <span>Risk Samples</span>
              <h2>风险词测试样例</h2>
            </div>
            <p>用于手动构造输出或 mock 数据，检查风险提示和分类展示是否正常。</p>
          </div>

          <div className="generation-qa-grid generation-qa-sample-grid">
            {riskExamples.map((example) => (
              <article className="generation-qa-card glass-card" key={example.title}>
                <span>Sample</span>
                <h3>{example.title}</h3>
                <div className="generation-qa-chip-list">
                  {example.items.map((item) => (
                    <span className="generation-qa-chip" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
                <p>{example.expected}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="generation-qa-section glass-card generation-qa-checklist-card">
          <div className="dashboard-section-header">
            <div>
              <span>Acceptance</span>
              <h2>人工验收标准</h2>
            </div>
            <p>验收重点是“少编造、能提示、可回到生成要求补充限制”。</p>
          </div>

          <div className="generation-qa-checklist">
            {acceptanceGroups.map((group) => (
              <article className="generation-qa-checklist-group" key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
