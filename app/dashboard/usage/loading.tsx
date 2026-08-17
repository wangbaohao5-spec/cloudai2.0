import { SystemLoading } from "@/components/ui/loading";

export default function UsageLoading() {
  return (
    <main className="dashboard-content">
      <SystemLoading label="正在加载额度数据..." description="正在汇总今日使用和最近额度记录。" />
    </main>
  );
}
