import { ContinueProductCard } from "@/components/dashboard/home/continue-product-card";
import { DashboardQuickStart } from "@/components/dashboard/home/dashboard-quick-start";
import { RecentOutputsList } from "@/components/dashboard/home/recent-outputs-list";
import { RecentProductsList } from "@/components/dashboard/home/recent-products-list";
import { TodayGeneratedSummary } from "@/components/dashboard/home/today-generated-summary";
import type { DashboardHomeData } from "@/lib/dashboard-home";
import { getFirstProductDashboardOnboarding } from "@/lib/first-product-onboarding";

type DashboardHomeShellProps = {
  data: DashboardHomeData;
};

export function DashboardHomeShell({ data }: DashboardHomeShellProps) {
  const firstProductOnboarding = getFirstProductDashboardOnboarding(data.isFirstProductUser);

  if (firstProductOnboarding) {
    return (
      <main className="dashboard-content">
        <section className="dashboard-home dashboard-home--first-product">
          <div className="dashboard-home-hero">
            <p className="eyebrow">First Product</p>
            <p>从第一件商品开始，完成一次从分析到素材整理的完整流程。</p>
          </div>
          <div className="dashboard-home-grid dashboard-home-grid--first-product">
            <ContinueProductCard onboarding={firstProductOnboarding} product={null} />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-content">
      <section className="dashboard-home">
        <div className="dashboard-home-hero">
          <p className="eyebrow">Workspace Overview</p>
          <p>继续商品创作、查看最近素材和工作进度。</p>
        </div>

        <div className="dashboard-home-grid">
          <ContinueProductCard product={data.continueProduct} />
          <TodayGeneratedSummary recentOutputCount={data.recentOutputs.length} recentProductCount={data.recentProducts.length} stats={data.todayGenerated} />
        </div>

        <RecentProductsList products={data.recentProducts} />
        <RecentOutputsList outputs={data.recentOutputs} />
        <DashboardQuickStart />
      </section>
    </main>
  );
}
