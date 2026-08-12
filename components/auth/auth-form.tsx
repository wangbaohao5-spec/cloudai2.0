"use client";

import Link from "next/link";
import { getSafeCallbackUrl } from "@/lib/auth-redirect";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthFormProps = {
  callbackUrl: string;
  mode: "login" | "register";
};

export function AuthForm({ callbackUrl, mode }: AuthFormProps) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isRegister = mode === "register";
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo: safeCallbackUrl,
      });

      if (result?.error) {
        throw new Error(isRegister ? "注册失败，请使用有效邮箱和至少 6 位密码。" : "登录失败，请检查邮箱和密码。");
      }

      router.push(safeCallbackUrl);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "认证失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        邮箱
        <input autoComplete="email" name="email" placeholder="you@cloudai.app" required type="email" />
      </label>
      <label>
        密码
        <input autoComplete={isRegister ? "new-password" : "current-password"} minLength={6} name="password" placeholder="至少 6 位密码" required type="password" />
      </label>
      <button className="button primary" disabled={isLoading} type="submit">
        {isLoading ? "处理中..." : isRegister ? "创建账号" : "登录"}
      </button>
      {error ? <p className="auth-error">{error}</p> : null}
      <p className="auth-switch">
        {isRegister ? "已有账号？" : "还没有账号？"}
        <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "去登录" : "去注册"}</Link>
      </p>
    </form>
  );
}
