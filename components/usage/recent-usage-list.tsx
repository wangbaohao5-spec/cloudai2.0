import type { UsageRecord } from "@/lib/usage";
import { USAGE_TYPE_LABELS } from "@/lib/usage-limits";

type RecentUsageListProps = {
  records: UsageRecord[];
};

function formatDateTime(createdAt: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

export function RecentUsageList({ records }: RecentUsageListProps) {
  return (
    <section className="dashboard-section glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Recent Usage</p>
          <h2>最近 AI 调用记录</h2>
        </div>
        <span>最近 20 条</span>
      </div>

      {records.length ? (
        <div className="recent-task-list">
          {records.map((record) => (
            <article className="recent-task-item" key={record.id}>
              <div>
                <strong>{USAGE_TYPE_LABELS[record.type]}</strong>
                <p>{record.model}</p>
              </div>
              <span>{formatDateTime(record.createdAt)}</span>
              <em>AI 调用</em>
            </article>
          ))}
        </div>
      ) : (
        <div className="history-empty-state">
          <p>暂无 AI 调用记录。完成一次 AI 请求后，这里会显示最新记录。</p>
        </div>
      )}
    </section>
  );
}
