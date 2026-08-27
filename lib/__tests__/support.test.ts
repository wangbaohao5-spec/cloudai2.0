import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSupportContact, SUPPORT_FEEDBACK_SUBJECT, SUPPORT_FEEDBACK_TEMPLATE } from "@/lib/support";

const workspaceRoot = process.cwd();

function readWorkspaceFile(relativePath: string) {
  return readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

describe("support contact", () => {
  it("builds a safe mailto link when a support email is configured", () => {
    const contact = getSupportContact({
      email: " beta-support@example.com ",
      qq: "",
      wechat: "",
    });

    expect(contact.email).toBe("beta-support@example.com");
    expect(contact.mailto).toContain("mailto:beta-support@example.com");
    expect(decodeURIComponent(contact.mailto || "")).toContain(SUPPORT_FEEDBACK_SUBJECT);
    expect(decodeURIComponent(contact.mailto || "")).toContain(SUPPORT_FEEDBACK_TEMPLATE);
  });

  it("returns a safe fallback state when no contact is configured", () => {
    expect(getSupportContact({ email: "", qq: "", wechat: "" })).toEqual({
      email: "",
      hasAnyContact: false,
      mailto: null,
      qq: "",
      wechat: "",
    });
  });

  it("does not render a malformed email as a mailto target", () => {
    const contact = getSupportContact({ email: "not-an-email", qq: "10001", wechat: "" });

    expect(contact.email).toBe("");
    expect(contact.mailto).toBeNull();
    expect(contact.hasAnyContact).toBe(true);
  });

  it("does not copy unrelated secret-like input into the public contact DTO", () => {
    const input = {
      email: "support@example.com",
      qq: "",
      wechat: "",
      AUTH_SECRET: "must-not-render",
    };

    expect(JSON.stringify(getSupportContact(input))).not.toContain("must-not-render");
  });
});

describe("support route integration", () => {
  it("inherits the authenticated dashboard layout", () => {
    const dashboardLayout = readWorkspaceFile("app/dashboard/layout.tsx");

    expect(dashboardLayout).toContain("getCurrentUser");
    expect(dashboardLayout).toContain('redirect("/login")');
    expect(readWorkspaceFile("app/dashboard/support/page.tsx")).toContain("反馈与支持");
  });

  it("is reachable from the account menu and existing contact panel", () => {
    expect(readWorkspaceFile("components/dashboard/dashboard-user-menu.tsx")).toContain(
      'href="/dashboard/support"',
    );
    expect(readWorkspaceFile("components/dashboard/dashboard-header.tsx")).toContain('href="/dashboard/support"');
  });

  it("uses public contact configuration and never references server secrets", () => {
    const pageSource = readWorkspaceFile("app/dashboard/support/page.tsx");
    const contactSource = readWorkspaceFile("lib/platform-contact.ts");
    const publicSource = `${pageSource}\n${contactSource}`;

    expect(publicSource).toContain("NEXT_PUBLIC_SUPPORT_EMAIL");
    expect(publicSource).not.toMatch(/AUTH_SECRET|DATABASE_URL|DIRECT_URL|SERVICE_ROLE_KEY/);
    expect(pageSource).toContain("请不要发送密码、API 密钥或其他敏感凭据");
  });

  it("uses the existing theme-aware card system and a narrow-screen grid", () => {
    const pageSource = readWorkspaceFile("app/dashboard/support/page.tsx");
    const styles = readWorkspaceFile("app/globals.css");

    expect(pageSource).toContain("cai-card cai-card--compact");
    expect(styles).toContain(".dashboard-support-grid");
    expect(styles).toContain("grid-template-columns: 1fr");
  });
});
