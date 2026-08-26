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

function getUsageStatus(record: UsageRecord) {
  if (record.status === "pending") {
    return { label: "处理中", detail: "任务完成后将自动结算" };
  }

  if (record.status === "refunded") {
    const systemFailureCodes = new Set(["ASSET_PERSIST_ERROR", "HISTORY_PERSIST_ERROR", "INTERNAL_ERROR", "STORAGE_ERROR"]);
    return {
      label: "已返还",
      detail: systemFailureCodes.has(record.failureCode || "") ? "系统异常已返还" : "生成失败已返还",
    };
  }

  return { label: "已完成", detail: `${record.units} 次额度` };
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
          {records.map((record) => {
            const status = getUsageStatus(record);

            return (
              <article className="recent-task-item" key={record.id}>
                <div>
                  <strong>{USAGE_TYPE_LABELS[record.type] || record.type}</strong>
                  <p>{status.detail}</p>
                </div>
                <span>{formatDateTime(record.createdAt)}</span>
                <em>{status.label}</em>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="📊"
          title="还没有额度记录"
          description="完成一次商品分析、上架文案或商品图任务后，这里会显示最近使用记录。"
          actionHref="/dashboard/products/new"
          actionLabel="创建商品"
        />
      )}
    </section>
  );
}
