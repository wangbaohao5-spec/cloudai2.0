import { signOut } from "@/auth";
import { DashboardUserMenu } from "@/components/dashboard/dashboard-user-menu";
import { HeaderActionPopover } from "@/components/dashboard/header-action-popover";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ThemeQuickToggle } from "@/components/dashboard/theme-quick-toggle";
import { PLATFORM_ANNOUNCEMENTS } from "@/lib/platform-announcements";
import { PLATFORM_CONTACT } from "@/lib/platform-contact";
import Link from "next/link";

type DashboardHeaderProps = {
  userEmail: string;
  userName: string;
};

export function DashboardHeader({ userEmail, userName }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <details className="dashboard-mobile-nav">
        <summary>菜单</summary>
        <DashboardNav variant="mobile" />
      </details>
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1>CloudAI 工作台</h1>
      </div>
      <div className="dashboard-header-actions">
        <HeaderActionPopover icon="plan" label="套餐">
          <div className="header-action-panel-header">
            <strong>套餐</strong>
            <span>创作额度与套餐能力</span>
          </div>
          <p>CloudAI 套餐与创作额度功能正在准备中。</p>
          <p>正式内测阶段将支持套餐开通、续费和额度管理。</p>
          <div className="header-action-panel-actions">
            <Link className="header-action-panel-link" href="/dashboard/subscription">
              查看订阅
            </Link>
            <Link className="header-action-panel-link is-secondary" href="/dashboard/usage">
              前往额度中心
            </Link>
          </div>
        </HeaderActionPopover>

        <HeaderActionPopover icon="announcement" label="公告">
          <div className="header-action-panel-header">
            <strong>系统公告</strong>
            <span>最近更新</span>
          </div>
          {PLATFORM_ANNOUNCEMENTS.length > 0 ? (
            <div className="header-announcement-list">
              {PLATFORM_ANNOUNCEMENTS.slice(0, 5).map((announcement) => (
                <article className="header-announcement-item" key={announcement.id}>
                  <strong>{announcement.title}</strong>
                  <p>{announcement.description}</p>
                  <time>{announcement.date}</time>
                </article>
              ))}
            </div>
          ) : (
            <p>暂无新公告。</p>
          )}
        </HeaderActionPopover>

        <HeaderActionPopover icon="contact" label="联系我们">
          <div className="header-action-panel-header">
            <strong>联系我们</strong>
            <span>问题反馈与产品建议</span>
          </div>
          <p>使用过程中遇到问题、生成失败或有产品建议，可以联系：</p>
          <dl className="header-contact-list">
            <div>
              <dt>QQ</dt>
              <dd>{PLATFORM_CONTACT.qq || "联系方式暂未配置"}</dd>
            </div>
            <div>
              <dt>微信</dt>
              <dd>{PLATFORM_CONTACT.wechat || "联系方式暂未配置"}</dd>
            </div>
          </dl>
        </HeaderActionPopover>

        <ThemeQuickToggle />

        <DashboardUserMenu userEmail={userEmail} userName={userName}>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="dashboard-user-menu-logout" type="submit">
              退出登录
            </button>
          </form>
        </DashboardUserMenu>
      </div>
    </header>
  );
}
