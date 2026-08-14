import { SystemLoading } from "@/components/ui/loading";

export default function HistoryLoading() {
  return (
    <main className="dashboard-content">
      <SystemLoading label="正在加载历史记录..." description="正在读取最近的生成与商品分析记录。" />
    </main>
  );
}
