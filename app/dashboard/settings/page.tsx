import { ThemeSelector } from "@/components/dashboard/theme-selector";

export default function SettingsPage() {
  return (
    <main className="dashboard-content">
      <section className="dashboard-settings-page">
        <div className="dashboard-settings-header">
          <p className="eyebrow">Settings</p>
          <h1>设置</h1>
          <p>当前为内部测试入口，后续会扩展为账号设置、外观设置和偏好设置。</p>
        </div>

        <section className="dashboard-settings-card cai-card cai-card--compact">
          <div>
            <h2>外观设置</h2>
            <p>选择 CloudAI 的界面主题。Business Light 是商务浅色测试主题，适合后续工作台和内测页面适配。</p>
          </div>

          <ThemeSelector />

          <p className="dashboard-settings-note">默认主题仍为 CloudAI Dark。此入口暂不出现在侧边栏。</p>
        </section>
      </section>
    </main>
  );
}
