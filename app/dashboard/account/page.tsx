import { auth } from "@/auth";
import { ThemeSelector } from "@/components/dashboard/theme-selector";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name || "CloudAI User";
  const userEmail = session.user.email || "未记录邮箱";
  const displayName = userName === userEmail ? "未设置用户名" : userName;

  return (
    <main className="dashboard-content">
      <section className="dashboard-account-page">
        <div className="dashboard-account-header">
          <p className="eyebrow">Account</p>
          <h1>个人中心</h1>
          <p>管理账号信息、外观主题和未来的个人偏好设置。</p>
        </div>

        <section className="dashboard-account-grid">
          <article className="dashboard-account-card cai-card cai-card--compact">
            <div>
              <h2>账号信息</h2>
              <p>当前登录账号的基础信息。</p>
            </div>
            <dl className="dashboard-account-list">
              <div>
                <dt>用户名</dt>
                <dd>{displayName}</dd>
              </div>
              <div>
                <dt>邮箱</dt>
                <dd>{userEmail}</dd>
              </div>
              <div>
                <dt>账号状态</dt>
                <dd>正常</dd>
              </div>
            </dl>
          </article>

          <article className="dashboard-account-card cai-card cai-card--compact">
            <div>
              <h2>外观设置</h2>
              <p>选择 CloudAI 的界面主题。Header 中的深色 / 浅色快捷切换会继续保留。</p>
            </div>
            <ThemeSelector />
          </article>

          <article className="dashboard-account-card cai-card cai-card--compact">
            <div>
              <h2>偏好设置</h2>
              <p>用户级偏好将在账号体系完善后逐步开放。</p>
            </div>
            <dl className="dashboard-account-list">
              <div>
                <dt>默认界面语言</dt>
                <dd>中文</dd>
              </div>
              <div>
                <dt>商品发布目标</dt>
                <dd>目前在每个商品中单独设置</dd>
              </div>
            </dl>
          </article>

          <article className="dashboard-account-card cai-card cai-card--compact">
            <div>
              <h2>安全与账号</h2>
              <p>账号安全设置将在正式账号体系完善后开放。</p>
            </div>
            <span className="cai-chip">即将开放</span>
          </article>
        </section>
      </section>
    </main>
  );
}
