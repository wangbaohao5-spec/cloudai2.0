import { EmptyState } from "@/components/ui/empty-state";
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
          <p className="eyebrow">Recent Quota</p>
          <h2>最近额度记录</h2>
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
              <em>额度使用</em>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📊"
          title="还没有额度记录"
          description="完成一次商品分析、上架文案或商品图任务后，这里会显示最近使用记录。"
          actionHref="/dashboard/products"
          actionLabel="创建商品"
        />
      )}
    </section>
  );
}
