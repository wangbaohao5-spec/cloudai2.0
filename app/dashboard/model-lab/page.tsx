type ModelStrategy = {
  description: string;
  name: string;
  scope: string;
};

type ModelTestRecord = {
  conclusion: string;
  cost: string;
  date: string;
  failureRate: string;
  jsonStability: number;
  model: string;
  notFitFor: string;
  productType: string;
  provider: string;
  quality: number;
  task: string;
  textControl: number;
  useFor: string;
  visualFidelity: number;
};

const modelStrategies: ModelStrategy[] = [
  {
    name: "默认文本模型",
    scope: "未单独配置的普通文本任务",
    description: "作为基础回退模型，优先关注稳定可用、错误可控和整体成本透明。",
  },
  {
    name: "创意文案模型",
    scope: "独立文案、商品文案",
    description: "适合更有表达力的标题、卖点和营销文案，可接受适度发散。",
  },
  {
    name: "稳定规划模型",
    scope: "详情页规划、套图规划",
    description: "优先关注结构化输出、JSON 稳定性、商品保真和页面任务不重复。",
  },
];

const modelTestRecords: ModelTestRecord[] = [
  {
    date: "示例，可编辑为真实测试结果",
    model: "5.6 luna",
    provider: "OpenAI-compatible",
    task: "商品文案",
    productType: "通用电商商品",
    cost: "待记录",
    quality: 4,
    visualFidelity: 3,
    jsonStability: 3,
    textControl: 4,
    failureRate: "待观察",
    useFor: "创意标题、营销表达、社媒文案",
    notFitFor: "高保真结构规划需继续观察",
    conclusion: "示例判断：适合创意文案和营销表达，真实结论需以项目测试记录为准。",
  },
  {
    date: "示例，可编辑为真实测试结果",
    model: "5.6 luna",
    provider: "OpenAI-compatible",
    task: "套图规划",
    productType: "结构敏感商品",
    cost: "待记录",
    quality: 4,
    visualFidelity: 2,
    jsonStability: 3,
    textControl: 3,
    failureRate: "待观察",
    useFor: "表达丰富的创意规划探索",
    notFitFor: "键盘、服装、首饰等需要严格保真的商品",
    conclusion: "示例判断：规划表达丰富，但可能更发散，需要重点观察商品保真。",
  },
  {
    date: "示例，可编辑为真实测试结果",
    model: "DeepSeek v4 pro",
    provider: "DeepSeek",
    task: "套图规划",
    productType: "电商详情页商品",
    cost: "待记录",
    quality: 3,
    visualFidelity: 4,
    jsonStability: 4,
    textControl: 3,
    failureRate: "待观察",
    useFor: "稳定规划、JSON 输出、保真优先任务",
    notFitFor: "需要强创意文案表达的场景仍需对比",
    conclusion: "示例判断：可作为稳定规划模型候选，需继续记录成本和 JSON 稳定性。",
  },
];

const tableHeaders = [
  "测试日期",
  "模型名称",
  "Provider",
  "任务类型",
  "商品类型",
  "单次成本",
  "输出质量",
  "商品保真",
  "JSON 稳定性",
  "文案可控性",
  "失败率",
  "适合场景",
  "不适合场景",
  "结论",
];

function ScorePill({ label, score }: { label: string; score: number }) {
  return (
    <span className="model-score-pill" aria-label={`${label} ${score} 分`}>
      {score}/5
    </span>
  );
}

export default function ModelLabPage() {
  return (
    <main className="dashboard-content">
      <section className="model-lab-page">
        <div className="model-lab-hero glass-card">
          <span>内部测试页</span>
          <h1>模型测试记录</h1>
          <p>用于记录不同模型在文案、详情页规划、套图规划等任务中的效果、成本和稳定性，帮助选择更合适的生产模型。</p>
          <p className="model-lab-notice">这是内部测试页，不代表正式价格或最终模型策略。模型成本和效果会随上游服务变化而变化。</p>
        </div>

        <section className="model-lab-section">
          <div className="dashboard-section-header">
            <div>
              <span>Model Strategy</span>
              <h2>当前模型策略</h2>
            </div>
            <p>模型选择按价格、稳定性、保真和 JSON 稳定性综合判断。</p>
          </div>

          <div className="model-strategy-grid">
            {modelStrategies.map((strategy) => (
              <article className="model-strategy-card glass-card" key={strategy.name}>
                <span>{strategy.scope}</span>
                <h3>{strategy.name}</h3>
                <p>{strategy.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="model-lab-section glass-card model-test-table-card">
          <div className="dashboard-section-header">
            <div>
              <span>Test Records</span>
              <h2>测试记录表</h2>
            </div>
            <p>以下为示例记录，可替换为真实内测结果；本页不调用模型，也不消耗额度。</p>
          </div>

          <div className="model-test-table-wrap">
            <table className="model-test-table">
              <thead>
                <tr>
                  {tableHeaders.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelTestRecords.map((record) => (
                  <tr key={`${record.model}-${record.task}-${record.productType}`}>
                    <td>{record.date}</td>
                    <td>{record.model}</td>
                    <td>{record.provider}</td>
                    <td>{record.task}</td>
                    <td>{record.productType}</td>
                    <td>{record.cost}</td>
                    <td>
                      <ScorePill label="输出质量" score={record.quality} />
                    </td>
                    <td>
                      <ScorePill label="商品保真" score={record.visualFidelity} />
                    </td>
                    <td>
                      <ScorePill label="JSON 稳定性" score={record.jsonStability} />
                    </td>
                    <td>
                      <ScorePill label="文案可控性" score={record.textControl} />
                    </td>
                    <td>{record.failureRate}</td>
                    <td>{record.useFor}</td>
                    <td>{record.notFitFor}</td>
                    <td>{record.conclusion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="model-conclusion-card glass-card">
          <span>下一步记录方向</span>
          <h2>建议沉淀真实测试样本</h2>
          <p>后续可以按商品类目、任务类型和生成模式记录稳定样本，再决定哪些任务使用创意文案模型，哪些任务固定使用稳定规划模型。</p>
        </section>
      </section>
    </main>
  );
}
