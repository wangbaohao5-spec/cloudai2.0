import { describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "../../lib/password.ts";
import {
  createBetaUser,
  createDirectPrismaClient,
  disableBetaUser,
  enableBetaUser,
  normalizeBetaEmail,
  resetBetaUserPassword,
} from "../beta-user.mjs";

function createClient(existing = null) {
  return {
    user: {
      create: vi.fn(async ({ data }) => ({ id: "new-user", ...data })),
      findUnique: vi.fn(async () => existing),
      update: vi.fn(async ({ data }) => ({ ...existing, ...data })),
    },
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

  it("does not overwrite an active user", async () => {
    const client = createClient({ id: "user-a", email: "beta@example.com", passwordHash: "hash", isActive: true });

    await expect(createBetaUser(client, { email: "beta@example.com", password: "password-123" })).rejects.toThrow("cannot be overwritten");
    expect(client.user.update).not.toHaveBeenCalled();
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
  });

  it("refuses to enable a user without a password", async () => {
    const client = createClient({ id: "user-a", email: "beta@example.com", passwordHash: null, isActive: false });

    await expect(enableBetaUser(client, "beta@example.com")).rejects.toThrow("has no password");
    expect(client.user.update).not.toHaveBeenCalled();
  });
});
