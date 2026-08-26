"use client";

import Link from "next/link";
import { getSafeCallbackUrl } from "@/lib/auth-redirect";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthFormProps = {
  callbackUrl: string;
};

export function AuthForm({ callbackUrl }: AuthFormProps) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
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
        throw new Error("登录失败，请检查账号或密码。");
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
        <input autoComplete="current-password" minLength={8} name="password" placeholder="至少 8 位密码" required type="password" />
      </label>
      <button className="button primary" disabled={isLoading} type="submit">
        {isLoading ? "登录中..." : "登录"}
      </button>
      {error ? <p className="auth-error">{error}</p> : null}
      <p className="auth-switch">
        CloudAI 目前处于封闭内测阶段。
        <Link href="/register">查看内测说明</Link>
      </p>
    </form>
  );
}
