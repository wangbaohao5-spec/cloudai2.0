import { describe, expect, it } from "vitest";
import { getTrustedClientIp, normalizeEmail } from "@/lib/auth-identity";

describe("auth identity", () => {
  it("normalizes email", () => {
    expect(normalizeEmail(" Beta.User@Example.COM ")).toBe("beta.user@example.com");
  });

  it("uses local proxy headers outside Vercel", () => {
    const previous = process.env.VERCEL;
    delete process.env.VERCEL;
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });

    expect(getTrustedClientIp(headers)).toBe("203.0.113.10");
    if (previous === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = previous;
    }
  });
});
