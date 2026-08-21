const assistantScopes = [
  "商品卖点",
  "平台风格",
  "素材策略",
  "主图点击力",
  "上架内容",
];

const workflowHints = [
  "先描述商品、目标人群和发布平台",
  "可以让助手检查标题、素材缺口或主图策略",
  "适合淘宝、小红书、抖音电商和跨境场景",
];

export function ChatSidebar() {
  return (
    <aside className="chat-sidebar cai-card cai-card--compact">
      <p className="eyebrow">Assistant Mode</p>
      <h2>创作助手</h2>
      <p className="chat-sidebar-intro">为商品内容创作提供方向判断、文案改写和素材策略建议。</p>
      <div className="chat-sidebar-section">
        <strong>可协助任务</strong>
        <div className="chat-scope-list">
          {assistantScopes.map((scope) => (
            <span key={scope}>{scope}</span>
          ))}
        </div>
      </div>
      <div className="chat-sidebar-section">
        <strong>对话建议</strong>
        <ul>
          {workflowHints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
