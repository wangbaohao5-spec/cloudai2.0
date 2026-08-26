import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";

const mockedAuth = auth as unknown as Mock;
const findUnique = vi.mocked(db.user.findUnique);
const DATABASE_USER_ID = "cm1234567890databaseuser";

function buildUser(isActive = true) {
  return {
    id: DATABASE_USER_ID,
    email: "tester@example.com",
    name: "Beta Tester",
    image: null,
    passwordHash: "$2b$12$placeholder",
    isActive,
    createdAt: new Date("2026-08-25T00:00:00.000Z"),
    updatedAt: new Date("2026-08-25T00:00:00.000Z"),
  };
}

function buildSession(userId?: string) {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: userId || "",
      email: "tester@example.com",
      name: "Beta Tester",
    },
  };
}

describe("getCurrentUser", () => {
  beforeEach(() => {
    mockedAuth.mockReset();
    findUnique.mockReset();
  });

  it("rejects a session without a database user id", async () => {
    mockedAuth.mockResolvedValue(buildSession(""));

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects a legacy email subject instead of falling back to email", async () => {
    mockedAuth.mockResolvedValue(buildSession("tester@example.com"));
    findUnique.mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "tester@example.com" } });
  });

  it("does not recreate a deleted user", async () => {
    mockedAuth.mockResolvedValue(buildSession(DATABASE_USER_ID));
    findUnique.mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("rejects an inactive user with an existing JWT", async () => {
    mockedAuth.mockResolvedValue(buildSession(DATABASE_USER_ID));
    findUnique.mockResolvedValue(buildUser(false));

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns the active database user used by ownership checks", async () => {
    const user = buildUser();
    mockedAuth.mockResolvedValue(buildSession(DATABASE_USER_ID));
    findUnique.mockResolvedValue(user);

    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: DATABASE_USER_ID } });
  });
});
