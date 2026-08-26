import { db } from "@/lib/db";
import { normalizeEmail, isValidEmail } from "@/lib/auth-identity";
import { clearLoginFailures, isLoginRateLimited, recordLoginFailure } from "@/lib/auth-login-rate-limit";
import { isPasswordValid, verifyPassword } from "@/lib/password";

export async function authenticateCredentials(emailValue: unknown, passwordValue: unknown, clientIp = "unknown") {
  const email = normalizeEmail(emailValue);
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const identity = { clientIp, email };

  if (await isLoginRateLimited(identity)) {
    return null;
  }

  if (!isValidEmail(email) || !isPasswordValid(password)) {
    await recordLoginFailure(identity);
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (!user?.passwordHash || !user.isActive) {
    await recordLoginFailure(identity);
    return null;
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    await recordLoginFailure(identity);
    return null;
  }

  await clearLoginFailures(identity);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}
