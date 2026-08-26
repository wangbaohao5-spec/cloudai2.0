import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { hashPassword } from "../lib/password.ts";

const OPERATIONS = new Set(["create", "reset-password", "disable", "enable"]);

export function normalizeBetaEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email address is required.");
  }
}

export async function createBetaUser(client, input, hasher = hashPassword) {
  const email = normalizeBetaEmail(input.email);
  validateEmail(email);
  const existing = await client.user.findUnique({ where: { email } });

  if (existing?.isActive || existing?.passwordHash) {
    throw new Error("Existing active or credentialed users cannot be overwritten. Use reset-password or enable instead.");
  }

  const passwordHash = await hasher(input.password);
  const name = input.name?.trim() || null;

  if (existing) {
    return client.user.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name } : {}),
        passwordHash,
        isActive: true,
      },
    });
  }

  return client.user.create({
    data: {
      email,
      name,
      passwordHash,
      isActive: true,
    },
  });
}

export async function resetBetaUserPassword(client, input, hasher = hashPassword) {
  const email = normalizeBetaEmail(input.email);
  validateEmail(email);
  const existing = await client.user.findUnique({ where: { email } });

  if (!existing) {
    throw new Error("User not found.");
  }

  return client.user.update({
    where: { id: existing.id },
    data: {
      passwordHash: await hasher(input.password),
    },
  });
}

export async function disableBetaUser(client, emailValue) {
  const email = normalizeBetaEmail(emailValue);
  validateEmail(email);
  const existing = await client.user.findUnique({ where: { email } });

  if (!existing) {
    throw new Error("User not found.");
  }

  return client.user.update({
    where: { id: existing.id },
    data: { isActive: false },
  });
}

export async function enableBetaUser(client, emailValue) {
  const email = normalizeBetaEmail(emailValue);
  validateEmail(email);
  const existing = await client.user.findUnique({ where: { email } });

  if (!existing) {
    throw new Error("User not found.");
  }

  if (!existing.passwordHash) {
    throw new Error("User has no password. Run create or reset-password first.");
  }

  return client.user.update({
    where: { id: existing.id },
    data: { isActive: true },
  });
}

function loadLocalEnvironment() {
  const envPath = resolve(process.cwd(), ".env.local");
  let contents = "";

  try {
    contents = readFileSync(envPath, "utf8");
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

async function promptText(label) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await prompt.question(label);
  } finally {
    prompt.close();
  }
}

async function promptHidden(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("A secure interactive terminal is required for password input.");
  }

  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolvePassword, reject) => {
    let password = "";

    function finish() {
      process.stdin.off("data", handleData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    }

    function handleData(chunk) {
      const input = chunk.toString("utf8");
      for (const character of input) {
        if (character === "\u0003") {
          finish();
          reject(new Error("Operation cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolvePassword(password);
          return;
        }
        if (character === "\b" || character === "\u007f") {
          password = password.slice(0, -1);
          continue;
        }
        password += character;
      }
    }

    process.stdin.on("data", handleData);
  });
}

function getDirectDatabaseTarget(value = process.env.DIRECT_URL) {
  if (!value) {
    throw new Error("DIRECT_URL is not configured.");
  }

  const url = new URL(value);
  if (url.port !== "5432" || url.hostname.includes("pooler")) {
    throw new Error("DIRECT_URL must use the direct PostgreSQL endpoint on port 5432.");
  }

  return {
    database: url.pathname.replace(/^\//, "") || "postgres",
    host: url.hostname,
  };
}

export function createDirectPrismaClient(
  Client = PrismaClient,
  directUrl = process.env.DIRECT_URL,
  Adapter = PrismaPg,
  readCertificate = readFileSync,
) {
  getDirectDatabaseTarget(directUrl);
  const adapter = new Adapter({
    connectionString: directUrl,
    max: 1,
    ssl: {
      ca: readCertificate(resolve(process.cwd(), "prisma", "certs", "supabase-prod-ca-2021.crt"), "utf8"),
      rejectUnauthorized: true,
    },
  });

  return new Client({ adapter });
}

async function runCli() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Beta user operations require an interactive terminal and explicit confirmation.");
  }

  loadLocalEnvironment();
  const operation = process.argv[2];
  if (!OPERATIONS.has(operation)) {
    throw new Error("Usage: beta-user.mjs <create|reset-password|disable|enable>");
  }

  const email = normalizeBetaEmail(await promptText("Email: "));
  validateEmail(email);
  const client = createDirectPrismaClient();

  try {
    const existing = await client.user.findUnique({ where: { email } });
    if (operation === "create" && (existing?.isActive || existing?.passwordHash)) {
      throw new Error("Existing active or credentialed users cannot be overwritten. Use reset-password or enable instead.");
    }
    if (operation !== "create" && !existing) {
      throw new Error("User not found.");
    }
    if (operation === "enable" && !existing?.passwordHash) {
      throw new Error("User has no password. Run create or reset-password first.");
    }

    const name = operation === "create" ? (await promptText("Name (optional): ")).trim() : "";
    const password = operation === "create" || operation === "reset-password" ? await promptHidden("Password: ") : "";
    const target = getDirectDatabaseTarget();

    console.log(`Database host: ${target.host}`);
    console.log(`Database name: ${target.database}`);
    console.log(`Operation: ${operation}`);
    console.log(`Email: ${email}`);
    if (operation === "create" && existing) {
      console.log("Existing inactive placeholder will receive credentials and be activated.");
    }

    const confirmation = (await promptText("Proceed? (y/N) ")).trim().toLowerCase();
    if (confirmation !== "y") {
      console.log("Cancelled. No database changes were made.");
      return;
    }

    if (operation === "create") {
      await createBetaUser(client, { email, name, password });
      console.log("Beta user created and enabled successfully.");
    } else if (operation === "reset-password") {
      await resetBetaUserPassword(client, { email, password });
      console.log("Password reset successfully.");
    } else if (operation === "disable") {
      await disableBetaUser(client, email);
      console.log("Beta user disabled successfully.");
    } else {
      await enableBetaUser(client, email);
      console.log("Beta user enabled successfully.");
    }
  } finally {
    await client.$disconnect();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : "Beta user operation failed.");
    process.exitCode = 1;
  });
}
