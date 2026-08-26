import { AuthShell } from "@/components/auth/auth-shell";
import { getSafeCallbackUrl } from "@/lib/auth-redirect";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  if (user) {
    redirect(safeCallbackUrl);
  }

  return <AuthShell callbackUrl={safeCallbackUrl} mode="login" />;
}
