import Link from "next/link";

export default function SubscriptionPage() {
  return (
    <main className="dashboard-content">
      <section className="dashboard-subscription-page">
        <div className="dashboard-subscription-header">
          <p className="eyebrow">Subscription</p>
          <h1>订阅</h1>
          <p>查看 CloudAI 未来套餐、创作额度和正式内测订阅能力的准备情况。</p>
        </div>

        <section className="dashboard-subscription-grid">
          <article className="dashboard-subscription-card dashboard-subscription-card--primary cai-card cai-card--compact">
            <div>
              <h2>当前套餐</h2>
              <p>CloudAI 当前处于内测准备阶段，暂未开放正式在线订阅。</p>
            </div>
            <span className="cai-badge cai-badge--neutral">暂无正式订阅套餐</span>
          </article>

          <article className="dashboard-subscription-card cai-card cai-card--compact">
            <div>
              <h2>未来套餐将关联</h2>
              <p>套餐会围绕商品内容创作所需的核心额度和高级能力逐步开放。</p>
            </div>
            <ul className="dashboard-subscription-list">
              <li>商品图片生成额度</li>
              <li>商品套图额度</li>
              <li>详情页素材额度</li>
              <li>视频创作额度</li>
              <li>高级生成能力</li>
            </ul>
          </article>

          <article className="dashboard-subscription-card cai-card cai-card--compact">
            <div>
              <h2>套餐入口</h2>
              <p>CloudAI 正在准备正式内测套餐与支付体系，当前阶段暂不开放在线订阅。</p>
            </div>
            <div className="dashboard-subscription-actions">
              <button className="cai-button cai-button--primary" disabled type="button">
                套餐功能准备中
              </button>
              <Link className="cai-button cai-button--secondary" href="/dashboard/usage">
                查看额度中心
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
