import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";

const STALE_PENDING_MS = 60 * 60 * 1000;
const SAFE_METADATA_KEYS = new Set([
  "analysisHistoryId",
  "assetId",
  "count",
  "historyId",
  "imageIndex",
  "pageIndex",
  "route",
  "sourceAssetId",
  "storagePath",
]);

function loadLocalEnvironment() {
  let contents = "";

  try {
    contents = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) {
      continue;
    }

    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function getDirectUrl(value = process.env.DIRECT_URL) {
  if (!value) {
    throw new Error("DIRECT_URL is not configured.");
  }

  const url = new URL(value);
  if (url.port !== "5432" || url.hostname.includes("pooler")) {
    throw new Error("Usage administration requires the direct PostgreSQL endpoint on port 5432.");
  }

  return value;
}

export function createDirectUsageClient(
  Client = PrismaClient,
  directUrl = process.env.DIRECT_URL,
  Adapter = PrismaPg,
  readCertificate = readFileSync,
) {
  const adapter = new Adapter({
    connectionString: getDirectUrl(directUrl),
    max: 1,
    ssl: {
      ca: readCertificate(resolve(process.cwd(), "prisma", "certs", "supabase-prod-ca-2021.crt"), "utf8"),
      rejectUnauthorized: true,
    },
  });

  return new Client({ adapter });
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return Object.fromEntries(Object.entries(metadata).filter(([key, value]) => SAFE_METADATA_KEYS.has(key) && ["string", "number", "boolean"].includes(typeof value)));
}

function truncateRequestId(requestId) {
  if (!requestId) {
    return "-";
  }

  return requestId.length <= 12 ? requestId : `${requestId.slice(0, 8)}...${requestId.slice(-4)}`;
}

export async function listStalePendingUsage(client, { now = new Date(), take = 100 } = {}) {
  return client.usageRecord.findMany({
    where: {
      status: "pending",
      createdAt: { lte: new Date(now.getTime() - STALE_PENDING_MS) },
    },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(take, 500)),
    select: {
      id: true,
      type: true,
      createdAt: true,
      requestId: true,
      metadata: true,
      user: { select: { id: true, email: true } },
    },
  });
}

export async function refundPendingUsage(client, usageRecordId) {
  if (!usageRecordId?.trim()) {
    throw new Error("A UsageRecord id is required.");
  }

  return client.$transaction(async (tx) => {
    const record = await tx.usageRecord.findUnique({ where: { id: usageRecordId.trim() } });

    if (!record) {
      throw new Error("UsageRecord not found.");
    }

    if (record.status !== "pending") {
      throw new Error(`Only pending usage can be reconciled. Current status: ${record.status}.`);
    }

    return tx.usageRecord.update({
      where: { id: record.id },
      data: {
        status: "refunded",
        settledAt: new Date(),
        failureCode: "INTERNAL_ERROR",
        metadata: {
          ...sanitizeMetadata(record.metadata),
          reconciliation: "manual-pending-refund",
        },
      },
    });
  });
}

async function confirm(message) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Manual refund requires an interactive terminal.");
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await prompt.question(message)).trim().toLowerCase() === "y";
  } finally {
    prompt.close();
  }
}

async function runCli() {
  loadLocalEnvironment();
  const operation = process.argv[2];
  const client = createDirectUsageClient();

  try {
    if (operation === "pending:list") {
      const records = await listStalePendingUsage(client);
      if (!records.length) {
        console.log("No stale pending usage records.");
        return;
      }

      console.table(records.map((record) => ({
        id: record.id,
        user: record.user.email || record.user.id,
        type: record.type,
        createdAt: record.createdAt.toISOString(),
        requestId: truncateRequestId(record.requestId),
        metadata: JSON.stringify(sanitizeMetadata(record.metadata)),
      })));
      return;
    }

    if (operation === "refund") {
      const usageRecordId = process.argv[3]?.trim();
      if (!usageRecordId) {
        throw new Error("Usage: pnpm usage:refund -- <usage-record-id>");
      }

      if (!(await confirm(`Refund pending UsageRecord ${usageRecordId}? (y/N) `))) {
        console.log("Cancelled. No database changes were made.");
        return;
      }

      await refundPendingUsage(client, usageRecordId);
      console.log("Pending usage was marked as refunded.");
      return;
    }

    throw new Error("Usage: usage-admin.mjs <pending:list|refund> [usage-record-id]");
  } finally {
    await client.$disconnect();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : "Usage administration failed.");
    process.exitCode = 1;
  });
}
