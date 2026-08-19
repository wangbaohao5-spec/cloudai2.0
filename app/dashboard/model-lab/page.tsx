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

type ImageModelTask = {
  defaultRoute: string;
  description: string;
  envProvider: string;
  name: string;
};

type ImageModelDimension = {
  description: string;
  name: string;
};

type ImageModelProductCase = {
  category: string;
  note: string;
  tasks: string[];
};

type ImageModelExperimentRecord = {
  category: string;
  conclusion: string;
  cost: string;
  date: string;
  failure: string;
  fidelityScore: string;
  model: string;
  platform: string;
  provider: string;
  structureScore: string;
  task: string;
  textScore: string;
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

const imageModelTasks: ImageModelTask[] = [
  {
    name: "商品套图",
    defaultRoute: "run-api / gpt-image-2",
    envProvider: "IMAGE_SET_IMAGE_PROVIDER",
    description: "默认 run-api / gpt-image-2，可通过 IMAGE_SET_IMAGE_PROVIDER 切换实验模型。",
  },
  {
    name: "详情页图片",
    defaultRoute: "run-api / gpt-image-2",
    envProvider: "DETAIL_PAGE_IMAGE_PROVIDER",
    description: "默认 run-api / gpt-image-2，可通过 DETAIL_PAGE_IMAGE_PROVIDER 切换实验模型。",
  },
  {
    name: "场景图",
    defaultRoute: "run-api / gpt-image-2",
    envProvider: "SCENE_IMAGE_PROVIDER",
    description: "默认 run-api / gpt-image-2，可通过 SCENE_IMAGE_PROVIDER 切换实验模型。",
  },
  {
    name: "商品图片优化",
    defaultRoute: "run-api / gpt-image-2",
    envProvider: "PRODUCT_IMAGE_EDIT_PROVIDER",
    description: "默认 run-api / gpt-image-2，可通过 PRODUCT_IMAGE_EDIT_PROVIDER 切换实验模型。",
  },
];

const imageModelDimensions: ImageModelDimension[] = [
  { name: "商品保真", description: "是否保持商品主体、Logo、颜色、结构、材质、图案。" },
  { name: "文字准确性", description: "图片中文字是否清楚，是否乱写品牌授权、认证、功效。" },
  { name: "结构稳定性", description: "是否按套图规划或详情页规划生成指定类型图片。" },
  { name: "比例稳定性", description: "是否符合 outputSettings.outputRatio。" },
  { name: "成本", description: "单次生成成本、失败重试成本。" },
  { name: "失败率", description: "超时、无图片返回、格式错误、上游失败。" },
  { name: "适用任务", description: "适合白底图、场景图、卖点图、详情图还是创意草图。" },
];

const imageModelProductCases: ImageModelProductCase[] = [
  {
    category: "服装",
    tasks: ["白底图", "场景图", "卖点图", "详情图"],
    note: "容易暴露版型、印花、Logo 和上身角度是否被改动。",
  },
  {
    category: "首饰",
    tasks: ["白底图", "佩戴场景", "材质细节", "套图"],
    note: "适合检查材质细节、珠串数量、光泽和佩戴比例。",
  },
  {
    category: "数码外设",
    tasks: ["白底图", "场景图", "功能卖点图", "详情图"],
    note: "重点观察键位布局、接口、Logo、灯效和结构稳定性。",
  },
];

const imageModelExperimentRecords: ImageModelExperimentRecord[] = [
  {
    date: "待测试",
    category: "服装",
    task: "套图",
    model: "gemini-3-pro-image-preview",
    provider: "gemini-image",
    platform: "待记录",
    fidelityScore: "待评分",
    textScore: "待评分",
    structureScore: "待评分",
    cost: "待记录",
    failure: "待记录",
    conclusion: "暂无真实测试记录。",
  },
  {
    date: "待测试",
    category: "首饰",
    task: "详情图",
    model: "gemini-3-pro-image-preview",
    provider: "gemini-image",
    platform: "待记录",
    fidelityScore: "待评分",
    textScore: "待评分",
    structureScore: "待评分",
    cost: "待记录",
    failure: "待记录",
    conclusion: "暂无真实测试记录。",
  },
  {
    date: "待测试",
    category: "数码外设",
    task: "场景图",
    model: "gemini-3-pro-image-preview",
    provider: "gemini-image",
    platform: "待记录",
    fidelityScore: "待评分",
    textScore: "待评分",
    structureScore: "待评分",
    cost: "待记录",
    failure: "待记录",
    conclusion: "暂无真实测试记录。",
  },
];

const imageModelTableHeaders = ["日期", "商品类目", "任务", "模型", "Provider", "平台/语言/比例", "保真评分", "文字评分", "结构评分", "成本", "失败情况", "结论"];

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

        <section className="model-lab-section glass-card model-lab-image-section">
          <div className="dashboard-section-header">
            <div>
              <span>Image Model Lab</span>
              <h2>图片模型实验记录</h2>
            </div>
            <p>用于记录不同图片模型在商品保真、文字准确性、结构稳定性、成本和失败率上的表现。普通用户不会看到模型选择，模型切换仅用于开发和内测。</p>
          </div>

          <div className="model-lab-grid">
            {imageModelTasks.map((task) => (
              <article className="model-lab-card" key={task.name}>
                <span>{task.envProvider}</span>
                <h3>{task.name}</h3>
                <p>{task.description}</p>
                <small>当前默认链路：{task.defaultRoute}</small>
              </article>
            ))}
          </div>

          <div className="model-lab-subsection">
            <div>
              <h3>测试维度</h3>
              <p>每次测试尽量按同一商品、同一任务、同一 outputSettings 对比，避免把 prompt 差异误判为模型差异。</p>
            </div>
            <div className="model-lab-grid model-lab-dimension-grid">
              {imageModelDimensions.map((dimension) => (
                <article className="model-lab-card model-lab-dimension-card" key={dimension.name}>
                  <h4>{dimension.name}</h4>
                  <p>{dimension.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="model-lab-subsection">
            <div>
              <h3>测试商品清单</h3>
              <p>这些类目是 CloudAI 当前测试中最常见、也最容易暴露保真问题的商品类型。</p>
            </div>
            <div className="model-lab-grid">
              {imageModelProductCases.map((productCase) => (
                <article className="model-lab-card" key={productCase.category}>
                  <h4>{productCase.category}</h4>
                  <div className="model-lab-chip-list">
                    {productCase.tasks.map((task) => (
                      <span key={task}>{task}</span>
                    ))}
                  </div>
                  <p>{productCase.note}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="model-test-table-wrap">
            <table className="model-test-table model-image-test-table">
              <thead>
                <tr>
                  {imageModelTableHeaders.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {imageModelExperimentRecords.map((record) => (
                  <tr key={`${record.category}-${record.task}-${record.provider}`}>
                    <td>{record.date}</td>
                    <td>{record.category}</td>
                    <td>{record.task}</td>
                    <td>{record.model}</td>
                    <td>{record.provider}</td>
                    <td>{record.platform}</td>
                    <td>{record.fidelityScore}</td>
                    <td>{record.textScore}</td>
                    <td>{record.structureScore}</td>
                    <td>{record.cost}</td>
                    <td>{record.failure}</td>
                    <td>{record.conclusion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="model-lab-env-grid">
            <article className="model-lab-card">
              <h3>env 切换说明</h3>
              <pre className="model-lab-code-block">{`# 切换套图单张到 Gemini
IMAGE_SET_IMAGE_PROVIDER=gemini-image
IMAGE_SET_IMAGE_MODEL=gemini-3-pro-image-preview

# 切换详情页图片到 Gemini
DETAIL_PAGE_IMAGE_PROVIDER=gemini-image
DETAIL_PAGE_IMAGE_MODEL=gemini-3-pro-image-preview

# 恢复默认
IMAGE_SET_IMAGE_PROVIDER=run-api
IMAGE_SET_IMAGE_MODEL=gpt-image-2`}</pre>
            </article>

            <article className="model-lab-card model-lab-note">
              <h3>测试原则</h3>
              <ul>
                <li>不要一开始一键生成 12 张。</li>
                <li>先单张测试白底图或场景图。</li>
                <li>每次只切一个任务，不要同时切所有图片任务。</li>
                <li>记录成本和失败情况，不满意时先切回默认模型。</li>
                <li>普通用户端不展示模型选择。</li>
              </ul>
            </article>
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
