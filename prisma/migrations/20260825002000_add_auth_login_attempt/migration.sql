CREATE TABLE "AuthLoginAttempt" (
    "identityHash" TEXT NOT NULL,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthLoginAttempt_pkey" PRIMARY KEY ("identityHash")
);

CREATE INDEX "AuthLoginAttempt_expiresAt_idx" ON "AuthLoginAttempt"("expiresAt");
