const navItems = [
  { href: "#features", label: "功能介绍" },
  { href: "#copywriting", label: "文案生成" },
  { href: "#image-generation", label: "图片生成" },
  { href: "#ai-chat", label: "AI 助手" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="navbar" aria-label="主导航">
        <a className="logo" href="#hero" aria-label="CloudAI 首页">
          <span className="logo-mark">C</span>
          <span>CloudAI</span>
        </a>
        <button className="nav-toggle" type="button" aria-label="打开导航菜单" aria-expanded="false">
          <span />
          <span />
          <span />
        </button>
        <ul className="nav-links">
          {navItems.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
        <a className="nav-cta" href="/dashboard">
          进入工作台
        </a>
      </nav>
    </header>
  );
}
