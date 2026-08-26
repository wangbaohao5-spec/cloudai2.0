import { describe, expect, it } from "vitest";
import { CLOSED_BETA_REGISTRATION_CONTENT } from "@/lib/auth-page-content";

describe("closed beta registration content", () => {
  it("keeps self-service registration disabled and directs approved users to login", () => {
    expect(CLOSED_BETA_REGISTRATION_CONTENT.registrationEnabled).toBe(false);
    expect(CLOSED_BETA_REGISTRATION_CONTENT.title).toBe("CloudAI 封闭内测");
    expect(CLOSED_BETA_REGISTRATION_CONTENT.actionHref).toBe("/login");
  });
});
