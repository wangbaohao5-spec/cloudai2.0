import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
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

  return <AuthShell callbackUrl={safeCallbackUrl} mode="register" />;
}
