const navItems = [
  { href: "#workflow", label: "工作流" },
  { href: "#capabilities", label: "核心能力" },
  { href: "#showcase", label: "生成示例" },
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
        <a className="nav-cta" href="/dashboard/products">
          进入工作台
        </a>
      </nav>
    </header>
  );
}
