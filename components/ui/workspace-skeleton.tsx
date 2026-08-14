type SkeletonPageProps = {
  variant: "dashboard" | "history" | "products" | "usage";
};

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`skeleton-block ${className}`} />;
}

export function WorkspaceSkeleton({ variant }: SkeletonPageProps) {
  if (variant === "products") {
    return (
      <main className="dashboard-content">
        <section className="workspace-skeleton product-workspace-shell" aria-label="正在加载商品工作台">
          <aside className="product-workspace-rail workspace-skeleton-panel">
            <SkeletonBlock className="skeleton-line short" />
            <SkeletonBlock className="skeleton-title" />
            <SkeletonBlock className="skeleton-media" />
            <SkeletonBlock className="skeleton-line" />
            <SkeletonBlock className="skeleton-line medium" />
            <SkeletonBlock className="skeleton-button" />
          </aside>
          <section className="product-workspace-main">
            <div className="product-workspace-tabs workspace-skeleton-panel">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock className="skeleton-tab" key={index} />
              ))}
            </div>
            <div className="product-workspace-panel glass-card workspace-skeleton-panel">
              <SkeletonBlock className="skeleton-title" />
              <SkeletonBlock className="skeleton-line" />
              <SkeletonBlock className="skeleton-grid" />
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-content">
      <section className={`workspace-skeleton workspace-skeleton-${variant}`} aria-label="正在加载工作区">
        <div className="dashboard-home-hero">
          <SkeletonBlock className="skeleton-line short" />
          <SkeletonBlock className="skeleton-hero-title" />
          <SkeletonBlock className="skeleton-line wide" />
        </div>
        <div className="workspace-skeleton-grid">
          {Array.from({ length: variant === "dashboard" ? 4 : 3 }).map((_, index) => (
            <article className="glass-card workspace-skeleton-panel" key={index}>
              <SkeletonBlock className="skeleton-media" />
              <SkeletonBlock className="skeleton-title" />
              <SkeletonBlock className="skeleton-line" />
              <SkeletonBlock className="skeleton-line medium" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
