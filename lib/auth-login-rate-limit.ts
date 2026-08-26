import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export const LOGIN_RATE_LIMIT_MAX_FAILURES = 5;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

type LoginIdentity = {
  clientIp: string;
  email: string;
};

function getIdentityHash({ clientIp, email }: LoginIdentity) {
  return createHash("sha256").update(`${email.slice(0, 320)}\n${clientIp.slice(0, 128)}`).digest("hex");
}

export async function isLoginRateLimited(identity: LoginIdentity, now = new Date()) {
  const identityHash = getIdentityHash(identity);

  await db.authLoginAttempt.deleteMany({
    where: {
      expiresAt: { lte: now },
    },
  });

  const attempt = await db.authLoginAttempt.findUnique({
    where: { identityHash },
  });

  return Boolean(attempt && attempt.expiresAt > now && attempt.failureCount >= LOGIN_RATE_LIMIT_MAX_FAILURES);
}

export async function recordLoginFailure(identity: LoginIdentity, now = new Date()) {
  const identityHash = getIdentityHash(identity);
  const expiresAt = new Date(now.getTime() + LOGIN_RATE_LIMIT_WINDOW_MS);

  await db.authLoginAttempt.upsert({
    where: { identityHash },
    create: {
      identityHash,
      failureCount: 1,
      windowStartedAt: now,
      expiresAt,
    },
    update: {
      failureCount: { increment: 1 },
    },
  });
}

export async function clearLoginFailures(identity: LoginIdentity) {
  await db.authLoginAttempt.deleteMany({
    where: {
      identityHash: getIdentityHash(identity),
    },
  });
}
