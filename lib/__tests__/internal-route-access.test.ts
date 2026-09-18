import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

import {
  getCurrentInternalUser,
  parseInternalUserIds,
  requireInternalRouteAccess,
} from "@/lib/internal-route-access";

const workspaceRoot = process.cwd();

function readWorkspaceFile(relativePath: string) {
  return readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

describe("internal route access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("INTERNAL_USER_IDS", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies an ordinary active user without revealing an internal page", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "beta-user", isActive: true });

    await expect(requireInternalRouteAccess()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("allows only a configured stable user id", async () => {
    const user = { id: "internal-user", isActive: true };
    vi.stubEnv("INTERNAL_USER_IDS", "other-user, internal-user");
    mocks.getCurrentUser.mockResolvedValue(user);

    await expect(getCurrentInternalUser()).resolves.toEqual(user);
    await expect(requireInternalRouteAccess()).resolves.toEqual(user);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it("normalizes the comma-separated allowlist without enabling blank entries", () => {
    expect([...parseInternalUserIds(" user-1, ,user-2,user-1 ")]).toEqual(["user-1", "user-2"]);
  });

  it("gates every experimental page at its server entry while leaving the dashboard layout unchanged", () => {
    for (const route of ["model-lab", "generation-qa", "image-enhance"]) {
      expect(readWorkspaceFile(`app/dashboard/${route}/page.tsx`)).toContain(
        "requireInternalRouteAccess",
      );
    }

    expect(readWorkspaceFile("app/dashboard/layout.tsx")).not.toContain("requireInternalRouteAccess");
  });
});
