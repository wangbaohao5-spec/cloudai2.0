import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    authLoginAttempt: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { authenticateCredentials } from "@/lib/authenticate-credentials";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const findUnique = vi.mocked(db.user.findUnique);
const deleteAttempts = vi.mocked(db.authLoginAttempt.deleteMany);
const findAttempt = vi.mocked(db.authLoginAttempt.findUnique);
const upsertAttempt = vi.mocked(db.authLoginAttempt.upsert);
const DATABASE_USER_ID = "cm1234567890databaseuser";
const VALID_PASSWORD = "beta-password-123";
let passwordHash = "";

function buildUser(overrides: Partial<NonNullable<Awaited<ReturnType<typeof db.user.findUnique>>>> = {}) {
  return {
    id: DATABASE_USER_ID,
    email: "tester@example.com",
    name: "Beta Tester",
    image: null,
    passwordHash,
    isActive: true,
    createdAt: new Date("2026-08-25T00:00:00.000Z"),
    updatedAt: new Date("2026-08-25T00:00:00.000Z"),
    ...overrides,
  };
}

describe("authenticateCredentials", () => {
  beforeAll(async () => {
    passwordHash = await hashPassword(VALID_PASSWORD);
  });

  beforeEach(() => {
    findUnique.mockReset();
    deleteAttempts.mockReset();
    findAttempt.mockReset();
    upsertAttempt.mockReset();
    deleteAttempts.mockResolvedValue({ count: 0 });
    findAttempt.mockResolvedValue(null);
  });

  it("rejects an unknown user", async () => {
    findUnique.mockResolvedValue(null);

    await expect(authenticateCredentials("missing@example.com", VALID_PASSWORD)).resolves.toBeNull();
    expect(upsertAttempt).toHaveBeenCalledOnce();
  });

  it("rejects a user without a password hash", async () => {
    findUnique.mockResolvedValue(buildUser({ passwordHash: null }));

    await expect(authenticateCredentials("tester@example.com", VALID_PASSWORD)).resolves.toBeNull();
  });

  it("rejects an inactive user", async () => {
    findUnique.mockResolvedValue(buildUser({ isActive: false }));

    await expect(authenticateCredentials("tester@example.com", VALID_PASSWORD)).resolves.toBeNull();
  });

  it("rejects an incorrect password", async () => {
    findUnique.mockResolvedValue(buildUser());

    await expect(authenticateCredentials("tester@example.com", "wrong-password")).resolves.toBeNull();
  });

  it("returns the database identity for valid credentials", async () => {
    findUnique.mockResolvedValue(buildUser());

    await expect(authenticateCredentials(" Tester@Example.com ", VALID_PASSWORD)).resolves.toEqual({
      id: DATABASE_USER_ID,
      email: "tester@example.com",
      name: "Beta Tester",
      image: null,
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { email: "tester@example.com" } });
    expect(upsertAttempt).not.toHaveBeenCalled();
    expect(deleteAttempts).toHaveBeenCalledTimes(2);
  });

  it("rejects a rate-limited identity before querying the user", async () => {
    findAttempt.mockResolvedValue({
      identityHash: "rate-limited",
      failureCount: 5,
      windowStartedAt: new Date("2026-08-25T00:00:00.000Z"),
      expiresAt: new Date("2099-08-25T00:15:00.000Z"),
      updatedAt: new Date("2026-08-25T00:00:00.000Z"),
    });

    await expect(authenticateCredentials("missing@example.com", VALID_PASSWORD, "203.0.113.10")).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects passwords shorter than the server minimum before querying", async () => {
    await expect(authenticateCredentials("tester@example.com", "short")).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
