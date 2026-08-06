import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || !databaseUrl.includes("pooler.supabase.com") || databaseUrl.includes("pgbouncer=true")) {
    return databaseUrl;
  }

  const separator = databaseUrl.includes("?") ? "&" : "?";

  return `${databaseUrl}${separator}pgbouncer=true&connection_limit=1`;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
