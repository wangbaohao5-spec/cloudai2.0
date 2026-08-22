import { ProductProjectCard } from "@/components/products/product-project-card";
import { ProductProjectEmptyState } from "@/components/products/product-project-empty-state";
import type { ProductProjectListResult } from "@/lib/product-projects";
import Link from "next/link";

type ProductProjectCenterProps = {
  result: ProductProjectListResult;
};

export function ProductProjectCenter({ result }: ProductProjectCenterProps) {
  const hasProjects = result.projects.length > 0;

  return (
    <main className="dashboard-content">
      <section className="product-project-center">
        <header className="product-project-center__header">
          <div>
            <p className="eyebrow">Product Projects</p>
            <h1>商品项目</h1>
            <p>把每个商品作为独立项目管理，从商品策划到素材包都集中在这里。</p>
          </div>
          <Link className="cai-button cai-button--primary" href="/dashboard/products/new">
            新建商品项目
          </Link>
        </header>

        {hasProjects ? (
          <section className="product-project-center__list" aria-label="全部商品项目">
            <div className="product-project-center__section-header">
              <div>
                <p className="eyebrow">All Projects</p>
                <h2>全部商品项目</h2>
              </div>
              <span>{result.total > result.projects.length ? `显示最近 ${result.projects.length} / ${result.total} 个` : `${result.projects.length} 个项目`}</span>
            </div>
            <div className="product-project-grid">
              {result.projects.map((project) => (
                <ProductProjectCard key={project.analysisHistoryId} project={project} />
              ))}
            </div>
          </section>
        ) : (
          <ProductProjectEmptyState />
        )}
      </section>
    </main>
  );
}
