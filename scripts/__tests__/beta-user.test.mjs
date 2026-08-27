import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword, verifyPassword } from "../../lib/password.ts";
import {
  createBetaUser,
  createDirectPrismaClient,
  disableBetaUser,
  enableBetaUser,
  formatBetaUserStatus,
  getBetaUserStatus,
  normalizeBetaEmail,
  resetBetaUserPassword,
} from "../beta-user.mjs";

function createClient(existing = null) {
  return {
    user: {
      create: vi.fn(async ({ data }) => ({ id: "new-user", ...data })),
      delete: vi.fn(),
      findUnique: vi.fn(async () => existing),
      update: vi.fn(async ({ data }) => ({ ...existing, ...data })),
    },
    asset: { deleteMany: vi.fn() },
    historyRecord: { deleteMany: vi.fn() },
    usageRecord: { deleteMany: vi.fn() },
  };
}

describe("beta user management", () => {
  it("creates the shared Prisma client with DIRECT_URL", () => {
    const directUrl = "postgresql://beta-admin@db.example.test:5432/postgres";
    const adapter = {};
    const adapterConstructor = vi.fn(function FakeAdapter(options) {
      this.options = options;
      return adapter;
    });
    const constructor = vi.fn(function FakePrismaClient(options) {
      this.options = options;
    });
    const readCertificate = vi.fn(() => "supabase-ca");

    createDirectPrismaClient(constructor, directUrl, adapterConstructor, readCertificate);

    expect(adapterConstructor).toHaveBeenCalledWith({
      connectionString: directUrl,
      max: 1,
      ssl: {
        ca: "supabase-ca",
        rejectUnauthorized: true,
      },
    });
    expect(readCertificate).toHaveBeenCalledWith(expect.stringContaining("supabase-prod-ca-2021.crt"), "utf8");
    expect(constructor).toHaveBeenCalledOnce();
    expect(constructor).toHaveBeenCalledWith({ adapter });
  });

  it("rejects transaction pooler connections", () => {
    const poolerUrl = "postgresql://beta-admin@aws-0.example.pooler.test:6543/postgres";

    expect(() => createDirectPrismaClient(vi.fn(), poolerUrl)).toThrow("direct PostgreSQL endpoint on port 5432");
  });

  it("normalizes email", () => {
    expect(normalizeBetaEmail(" Beta@Example.COM ")).toBe("beta@example.com");
  });

  it("creates and activates a new user", async () => {
    const client = createClient();
    await createBetaUser(client, { email: " Beta@Example.COM ", name: "Beta", password: "password-123" }, async () => "hash");

    expect(client.user.create).toHaveBeenCalledWith({
      data: { email: "beta@example.com", name: "Beta", passwordHash: "hash", isActive: true },
    });
  });

  it("does not overwrite an existing user", async () => {
    const client = createClient({ id: "user-a", email: "beta@example.com", passwordHash: "hash", isActive: true });

    await expect(createBetaUser(client, { email: "beta@example.com", password: "password-123" })).rejects.toThrow("already exists");
    expect(client.user.update).not.toHaveBeenCalled();
    expect(client.user.create).not.toHaveBeenCalled();
  });

  it("does not overwrite an inactive legacy user without credentials", async () => {
    const client = createClient({ id: "user-a", email: "beta@example.com", passwordHash: null, isActive: false });

    await expect(createBetaUser(client, { email: "beta@example.com", password: "password-123" })).rejects.toThrow("already exists");
    expect(client.user.update).not.toHaveBeenCalled();
    expect(client.user.create).not.toHaveBeenCalled();
  });

  it("resets a password without changing active state", async () => {
    const client = createClient({ id: "user-a", email: "beta@example.com", passwordHash: "old", isActive: false });
    await resetBetaUserPassword(client, { email: "beta@example.com", password: "password-456" }, async () => "new");

    expect(client.user.update).toHaveBeenCalledWith({ where: { id: "user-a" }, data: { passwordHash: "new" } });
  });

  it("makes the old password invalid and the new password valid after reset", async () => {
    const oldPassword = "old-password-123";
    const newPassword = "new-password-456";
    const existing = { id: "user-a", email: "beta@example.com", passwordHash: await hashPassword(oldPassword), isActive: true };
    const client = createClient(existing);

    await resetBetaUserPassword(client, { email: existing.email, password: newPassword });
    const nextHash = client.user.update.mock.calls[0][0].data.passwordHash;

    await expect(verifyPassword(oldPassword, nextHash)).resolves.toBe(false);
    await expect(verifyPassword(newPassword, nextHash)).resolves.toBe(true);
  });

  it("disables without deleting user data", async () => {
    const client = createClient({ id: "user-a", email: "beta@example.com", passwordHash: "hash", isActive: true });
    await disableBetaUser(client, "beta@example.com");

    expect(client.user.update).toHaveBeenCalledWith({ where: { id: "user-a" }, data: { isActive: false } });
    expect(client.user.delete).not.toHaveBeenCalled();
    expect(client.historyRecord.deleteMany).not.toHaveBeenCalled();
    expect(client.asset.deleteMany).not.toHaveBeenCalled();
    expect(client.usageRecord.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses to enable a user without a password", async () => {
    const client = createClient({ id: "user-a", email: "beta@example.com", passwordHash: null, isActive: false });

    await expect(enableBetaUser(client, "beta@example.com")).rejects.toThrow("has no password");
    expect(client.user.update).not.toHaveBeenCalled();
  });

  it("returns safe status for an active user", async () => {
    const createdAt = new Date("2026-08-27T10:00:00.000Z");
    const client = createClient({
      id: "user-a",
      email: "beta@example.com",
      passwordHash: "secret-hash",
      isActive: true,
      createdAt,
      _count: { historyRecords: 12, assets: 7, usageRecords: 15 },
    });

    await expect(getBetaUserStatus(client, " BETA@example.com ")).resolves.toEqual({
      userId: "user-a",
      email: "beta@example.com",
      active: true,
      passwordConfigured: true,
      createdAt,
      historyCount: 12,
      assetCount: 7,
      usageCount: 15,
    });
  });

  it("returns disabled status without exposing passwordHash", async () => {
    const status = await getBetaUserStatus(createClient({
      id: "user-b",
      email: "disabled@example.com",
      passwordHash: "must-not-render",
      isActive: false,
      createdAt: new Date("2026-08-27T11:00:00.000Z"),
      _count: { historyRecords: 0, assets: 0, usageRecords: 0 },
    }), "disabled@example.com");
    const output = JSON.stringify(formatBetaUserStatus(status));

    expect(output).toContain('"status":"disabled"');
    expect(output).toContain('"passwordConfigured":"yes"');
    expect(output).not.toContain("passwordHash");
    expect(output).not.toContain("must-not-render");
  });

  it("fails status for a missing user", async () => {
    await expect(getBetaUserStatus(createClient(), "missing@example.com")).rejects.toThrow("User not found");
  });

  it("keeps the operations document free of real credentials", () => {
    const document = readFileSync(resolve(process.cwd(), "docs", "BETA-OPERATIONS.md"), "utf8");

    expect(document).toContain("<production-url>");
    expect(document).toContain("<email>");
    expect(document).not.toMatch(/postgresql:\/\//i);
    expect(document).not.toMatch(/passwordHash\s*[:=]\s*[^\s`]+/i);
    expect(document).not.toMatch(/DIRECT_URL\s*=/);
  });
});
