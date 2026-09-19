import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = process.cwd();

function readWorkspaceFile(relativePath: string) {
  return readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

const legacyLandingSelectors = [
  "landing-analysis-list",
  "landing-capability-card",
  "landing-capability-grid",
  "landing-example",
  "landing-example-card",
  "landing-example-grid",
  "landing-final-cta",
  "landing-output-list",
  "landing-product-mock",
  "landing-showcase-card",
  "landing-showcase-copy",
  "landing-showcase-description",
  "landing-showcase-detail",
  "landing-showcase-grid",
  "landing-showcase-label",
  "landing-showcase-product",
  "landing-showcase-visual",
  "landing-workflow-card",
  "landing-workflow-grid",
  "landing-workspace-assets",
  "landing-workspace-board",
  "landing-workspace-mock",
  "landing-workspace-panel",
  "landing-workspace-preview-section",
  "landing-workspace-rail",
  "landing-workspace-tabs",
];

describe("performance quick-win boundaries", () => {
  it("loads Workspace CSS only from its real route consumers", () => {
    expect(readWorkspaceFile("app/layout.tsx")).not.toContain("product-workspace.css");
    expect(readWorkspaceFile("app/dashboard/products/page.tsx")).toContain('import "../../product-workspace.css"');
    expect(readWorkspaceFile("app/dashboard/products/new/page.tsx")).toContain('import "../../../product-workspace.css"');
    expect(readWorkspaceFile("app/dashboard/detail-page/page.tsx")).toContain('import "../../product-workspace.css"');
    expect(readWorkspaceFile("app/dashboard/products/all/page.tsx")).not.toContain("product-workspace.css");
  });

  it("keeps current-user memoization request-scoped", () => {
    const source = readWorkspaceFile("lib/current-user.ts");
    expect(source).toContain('import { cache } from "react"');
    expect(source).toContain("export const getCurrentUser = cache(");
    expect(source).not.toContain("unstable_cache");
  });

  it("does not retain the confirmed unused Landing selectors", () => {
    const styles = readWorkspaceFile("app/globals.css");
    for (const selector of legacyLandingSelectors) {
      expect(styles).not.toContain(`.${selector}`);
    }
  });

  it("gives high fetch priority to only the current-product first-fold image", () => {
    const currentProduct = readWorkspaceFile("components/dashboard/home/continue-product-card.tsx");
    const dashboardSources = [
      currentProduct,
      readWorkspaceFile("components/dashboard/home/recent-outputs-list.tsx"),
      readWorkspaceFile("components/dashboard/home/recent-products-list.tsx"),
    ].join("\n");

    expect(currentProduct).toContain('fetchPriority="high"');
    expect(dashboardSources.match(/fetchPriority="high"/g)).toHaveLength(1);
  });
});
