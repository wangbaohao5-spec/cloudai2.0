ALTER TABLE "UsageRecord"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'succeeded',
ADD COLUMN "requestId" TEXT,
ADD COLUMN "units" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "settledAt" TIMESTAMP(3),
ADD COLUMN "failureCode" TEXT,
ADD COLUMN "metadata" JSONB;

CREATE UNIQUE INDEX "UsageRecord_userId_requestId_key" ON "UsageRecord"("userId", "requestId");
CREATE INDEX "UsageRecord_userId_type_status_createdAt_idx" ON "UsageRecord"("userId", "type", "status", "createdAt");
