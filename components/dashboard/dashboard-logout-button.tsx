"use client";

import { clearProductSessionStorage } from "@/lib/product-session-storage";
import { signOut } from "next-auth/react";
import { useState } from "react";

export function DashboardLogoutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    clearProductSessionStorage(window.sessionStorage);
    await signOut({ redirectTo: "/login" });
  }

  return (
    <button className="dashboard-user-menu-logout" disabled={isSigningOut} onClick={handleSignOut} type="button">
      {isSigningOut ? "退出中..." : "退出登录"}
    </button>
  );
}
