"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type DashboardUserMenuProps = {
  children: ReactNode;
  userEmail: string;
  userName: string;
};

function getAvatarInitial(userName: string, userEmail: string) {
  const source = (userName || userEmail || "C").trim();
  return source.slice(0, 1).toUpperCase();
}

function getAccountLabels(userName: string, userEmail: string) {
  const normalizedName = userName.trim();
  const normalizedEmail = userEmail.trim();

  if (normalizedName && normalizedEmail && normalizedName !== normalizedEmail) {
    return {
      primary: normalizedName,
      secondary: normalizedEmail,
    };
  }

  return {
    primary: normalizedEmail || normalizedName || "CloudAI User",
    secondary: "",
  };
}

export function DashboardUserMenu({ children, userEmail, userName }: DashboardUserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const account = useMemo(() => getAccountLabels(userName, userEmail), [userEmail, userName]);
  const avatarInitial = useMemo(() => getAvatarInitial(userName, userEmail), [userEmail, userName]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="dashboard-user-menu" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label="账户菜单"
        className="dashboard-avatar-button"
        onClick={() => setOpen((current) => !current)}
        title="账户菜单"
        type="button"
      >
        {avatarInitial}
      </button>
      {open ? (
        <div className="dashboard-user-menu-panel">
          <div className="dashboard-user-menu-profile">
            <span className="dashboard-user-menu-avatar">{avatarInitial}</span>
            <span>
              <strong>{account.primary}</strong>
              {account.secondary ? <em>{account.secondary}</em> : null}
            </span>
          </div>

          <div className="dashboard-user-menu-group" aria-label="账号">
            <Link className="dashboard-user-menu-item" href="/dashboard/subscription" onClick={() => setOpen(false)}>
              <span>订阅</span>
            </Link>
            <Link className="dashboard-user-menu-item" href="/dashboard/usage" onClick={() => setOpen(false)}>
              <span>额度中心</span>
            </Link>
            <Link className="dashboard-user-menu-item" href="/dashboard/history" onClick={() => setOpen(false)}>
              <span>历史记录</span>
            </Link>
            <Link className="dashboard-user-menu-item" href="/dashboard/account" onClick={() => setOpen(false)}>
              <span>个人中心</span>
            </Link>
          </div>

          <div className="dashboard-user-menu-group" aria-label="其它">
            <Link className="dashboard-user-menu-item" href="/dashboard/support" onClick={() => setOpen(false)}>
              <span>反馈与支持</span>
            </Link>
            <button className="dashboard-user-menu-item is-disabled" disabled type="button">
              <span>邀请任务</span>
              <em>即将开放</em>
            </button>
          </div>

          <div className="dashboard-user-menu-footer">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
