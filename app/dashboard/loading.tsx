import { SystemLoading } from "@/components/ui/loading";

export default function DashboardLoading() {
  return (
    <main className="dashboard-content">
      <SystemLoading label="正在加载工作台..." description="CloudAI 正在整理最近商品、今日生成和快捷入口。" />
    </main>
  );
}
