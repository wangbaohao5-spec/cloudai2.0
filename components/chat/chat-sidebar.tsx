const assistantScopes = [
  "商品定位",
  "标题优化",
  "卖点分析",
  "短视频脚本",
  "平台运营建议",
];

const workflowHints = [
  "先描述商品、目标人群和平台",
  "继续追问时可以让助手改写上一版",
  "适合淘宝、抖音电商、TikTok Shop 和跨境场景",
];

export function ChatSidebar() {
  return (
    <aside className="chat-sidebar glass-card">
      <p className="eyebrow">Assistant Mode</p>
      <h2>创作助手</h2>
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
