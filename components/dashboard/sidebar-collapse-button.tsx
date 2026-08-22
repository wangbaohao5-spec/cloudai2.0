"use client";

type SidebarCollapseButtonProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function SidebarCollapseButton({ collapsed, onToggle }: SidebarCollapseButtonProps) {
  const label = collapsed ? "展开侧边栏" : "收起侧边栏";

  return (
    <button
      aria-label={label}
      className="sidebar-collapse-button"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="sidebar-collapse-button__icon"
        fill="none"
        height="18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="18"
      >
        <rect height="16" rx="2" width="18" x="3" y="4" />
        <path d="M9 4v16" />
        {collapsed ? <path d="m14 10 2 2-2 2" /> : <path d="m16 10-2 2 2 2" />}
      </svg>
      <span className="sidebar-collapse-button__label">收起侧边栏</span>
    </button>
  );
}
