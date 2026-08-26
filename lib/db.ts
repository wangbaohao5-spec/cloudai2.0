import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getPrismaDatabaseUrl } from "@/lib/server-env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const databaseUrl = getPrismaDatabaseUrl();
  const isSupabasePooler = new URL(databaseUrl).hostname.endsWith(".pooler.supabase.com");
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    ...(isSupabasePooler
      ? {
          max: 1,
          ssl: {
            ca: readFileSync(
              join(process.cwd(), "prisma", "certs", "supabase-prod-ca-2021.crt"),
              "utf8",
            ),
            rejectUnauthorized: true,
          },
        }
      : {}),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
