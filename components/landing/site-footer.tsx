import { BrandLockup } from "@/components/brand/brand-lockup";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

type SiteFooterProps = {
  isAuthenticated: boolean;
};

export function SiteFooter({ isAuthenticated }: SiteFooterProps) {
  return (
    <footer className="landing-footer">
      <div className="landing-shell landing-footer-grid">
        <div className="landing-footer-brand">
          <a className="landing-logo" href="#hero" aria-label={`${BRAND.name} 官网首页`}>
            <BrandLockup className="landing-logo-mark" />
          </a>
          <p>AI 电商商品上架内容工作台</p>
        </div>
        <div>
          <strong>产品</strong>
          <a href="#workflow">工作流</a>
          <a href="#product">核心能力</a>
          <Link href="/dashboard/products">商品工作台</Link>
        </div>
        <div>
          <strong>支持</strong>
          <Link href="/dashboard/support">反馈与支持</Link>
          {!isAuthenticated && <Link href="/login">内测账号登录</Link>}
        </div>
        <div>
          <strong>Beta</strong>
          <span>封闭内测</span>
          <span>暂未开放公开注册</span>
        </div>
      </div>
      <div className="landing-shell landing-footer-bottom">
        <span>© 2026 {BRAND.name}</span>
        <span>为真实商品内容工作流而设计</span>
      </div>
    </footer>
  );
}
