import { AuthShell } from "@/components/auth/auth-shell";
import { getSafeCallbackUrl } from "@/lib/auth-redirect";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

type RegisterPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const user = await getCurrentUser();
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  if (user) {
    redirect(safeCallbackUrl);
  }

  return <AuthShell callbackUrl={safeCallbackUrl} mode="register" />;
}
