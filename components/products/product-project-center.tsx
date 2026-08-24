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
            <p className="eyebrow">ALL PRODUCTS</p>
            <h1>全部商品</h1>
            <p>查看已经在 CloudAI 中创建过的商品，并继续之前的创作。</p>
          </div>
          <Link className="cai-button cai-button--primary" href="/dashboard/products/new">
            新建商品
          </Link>
        </header>

        {hasProjects ? (
          <section className="product-project-center__list" aria-label="全部商品">
            <div className="product-project-center__section-header">
              <div>
                <p className="eyebrow">YOUR PRODUCTS</p>
                <h2>已创建商品</h2>
              </div>
              <span>{result.total > result.projects.length ? `显示最近 ${result.projects.length} / ${result.total} 个` : `${result.projects.length} 个商品`}</span>
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
