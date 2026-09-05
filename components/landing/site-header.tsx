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
        <a className="landing-logo" href="#hero" aria-label="CloudAI 官网首页">
          <span className="landing-logo-mark" aria-hidden="true">C</span>
          <span>CloudAI</span>
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
