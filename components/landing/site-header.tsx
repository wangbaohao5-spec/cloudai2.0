import { BrandLockup } from "@/components/brand/brand-lockup";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

type SiteHeaderProps = {
  isAuthenticated: boolean;
};

const navItems = [
  { href: "#product", label: "产品" },
  { href: "#workflow", label: "工作流" },
  { href: "#beta", label: "封闭内测" },
];

export function SiteHeader({ isAuthenticated }: SiteHeaderProps) {
  return (
    <header className="landing-header">
      <nav className="landing-shell landing-nav" aria-label="官网主导航">
        <a className="landing-logo" href="#hero" aria-label={`${BRAND.name} 官网首页`}>
          <BrandLockup className="landing-logo-mark" />
        </a>
        <ul className="landing-nav-links">
          {navItems.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
        <div className="landing-nav-actions">
          {!isAuthenticated && <Link href="/login">登录</Link>}
          <Link className="landing-nav-cta" href="/dashboard/products">进入工作台</Link>
        </div>
        <details className="landing-mobile-nav">
          <summary aria-label="打开导航菜单">菜单</summary>
          <div>
            {navItems.map((item) => (
              <a href={item.href} key={item.href}>{item.label}</a>
            ))}
            {!isAuthenticated && <Link href="/login">登录</Link>}
            <Link className="landing-mobile-cta" href="/dashboard/products">进入工作台</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}
