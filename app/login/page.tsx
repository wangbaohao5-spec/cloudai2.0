import { auth } from "@/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { getSafeCallbackUrl } from "@/lib/auth-redirect";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  if (session?.user) {
    redirect(safeCallbackUrl);
  }

  return (
    <main className="auth-page">
      <section className="auth-card glass-card">
        <p className="eyebrow">CloudAI Account</p>
        <h1>登录 CloudAI</h1>
        <p>进入工作台，继续创建你的 AI 电商内容。</p>
        <AuthForm callbackUrl={safeCallbackUrl} mode="login" />
      </section>
    </main>
  );
}
