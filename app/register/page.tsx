import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { getSafeCallbackUrl } from "@/lib/auth-redirect";
import { redirect } from "next/navigation";

type RegisterPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  if (session?.user) {
    redirect(safeCallbackUrl);
  }

  return (
    <main className="auth-page">
      <section className="auth-card glass-card">
        <p className="eyebrow">Create Account</p>
        <h1>注册 CloudAI</h1>
        <p>第一阶段先创建本地会话，后续可接入真实用户数据库。</p>
        <AuthForm callbackUrl={safeCallbackUrl} mode="register" />
      </section>
    </main>
  );
}
