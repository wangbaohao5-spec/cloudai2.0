import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    authLoginAttempt: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { LOGIN_RATE_LIMIT_MAX_FAILURES, isLoginRateLimited, recordLoginFailure } from "@/lib/auth-login-rate-limit";
import { db } from "@/lib/db";

const deleteMany = vi.mocked(db.authLoginAttempt.deleteMany);
const findUnique = vi.mocked(db.authLoginAttempt.findUnique);
const upsert = vi.mocked(db.authLoginAttempt.upsert);
const identity = { email: "missing@example.com", clientIp: "203.0.113.10" };

describe("auth login rate limit", () => {
  beforeEach(() => {
    deleteMany.mockReset();
    findUnique.mockReset();
    upsert.mockReset();
    deleteMany.mockResolvedValue({ count: 0 });
  });

  it("allows verification below five failures", async () => {
    findUnique.mockResolvedValue({
      identityHash: "hash",
      failureCount: LOGIN_RATE_LIMIT_MAX_FAILURES - 1,
      windowStartedAt: new Date("2026-08-25T00:00:00.000Z"),
      expiresAt: new Date("2026-08-25T00:15:00.000Z"),
      updatedAt: new Date("2026-08-25T00:00:00.000Z"),
    });

    await expect(isLoginRateLimited(identity, new Date("2026-08-25T00:05:00.000Z"))).resolves.toBe(false);
  });

  it("rejects verification at the failure threshold", async () => {
    findUnique.mockResolvedValue({
      identityHash: "hash",
      failureCount: LOGIN_RATE_LIMIT_MAX_FAILURES,
      windowStartedAt: new Date("2026-08-25T00:00:00.000Z"),
      expiresAt: new Date("2026-08-25T00:15:00.000Z"),
      updatedAt: new Date("2026-08-25T00:00:00.000Z"),
    });

    await expect(isLoginRateLimited(identity, new Date("2026-08-25T00:05:00.000Z"))).resolves.toBe(true);
  });

  it("allows verification after the window expires", async () => {
    findUnique.mockResolvedValue({
      identityHash: "hash",
      failureCount: LOGIN_RATE_LIMIT_MAX_FAILURES,
      windowStartedAt: new Date("2026-08-25T00:00:00.000Z"),
      expiresAt: new Date("2026-08-25T00:15:00.000Z"),
      updatedAt: new Date("2026-08-25T00:00:00.000Z"),
    });

    await expect(isLoginRateLimited(identity, new Date("2026-08-25T00:16:00.000Z"))).resolves.toBe(false);
  });

  it("records failures without storing email or IP", async () => {
    await recordLoginFailure(identity, new Date("2026-08-25T00:00:00.000Z"));

    const call = upsert.mock.calls[0][0];
    expect(call.create.identityHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(call)).not.toContain(identity.email);
    expect(JSON.stringify(call)).not.toContain(identity.clientIp);
  });
});
