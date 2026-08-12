import { ContinueProductCard } from "@/components/dashboard/home/continue-product-card";
import { DashboardQuickStart } from "@/components/dashboard/home/dashboard-quick-start";
import { RecentProductsList } from "@/components/dashboard/home/recent-products-list";
import { TodayGeneratedSummary } from "@/components/dashboard/home/today-generated-summary";
import type { DashboardHomeData } from "@/lib/dashboard-home";

type DashboardHomeShellProps = {
  data: DashboardHomeData;
};

export function DashboardHomeShell({ data }: DashboardHomeShellProps) {
  return (
    <main className="dashboard-content">
      <section className="dashboard-home">
        <div className="dashboard-home-hero">
          <p className="eyebrow">CloudAI Workspace</p>
          <h1>商品创作工作台</h1>
          <p>继续上次的商品创作，查看今天生成的素材，并快速进入下一步。</p>
        </div>

        <div className="dashboard-home-grid">
          <ContinueProductCard product={data.continueProduct} />
          <TodayGeneratedSummary stats={data.todayGenerated} />
        </div>

        <RecentProductsList products={data.recentProducts} />
        <DashboardQuickStart />
      </section>
    </main>
  );
}
