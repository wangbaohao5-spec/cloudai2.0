import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createIntent: vi.fn(),
  getCurrentUser: vi.fn(),
  logTrigger: vi.fn(),
}));

vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/detail-page-generation-diagnostics", () => ({ logDetailPageGenerationTrigger: mocks.logTrigger }));
vi.mock("@/lib/detail-page-section-generation", () => ({
  createDetailPageSectionGenerationIntent: mocks.createIntent,
}));

import { POST } from "@/app/api/products/detail-page/sections/intent/route";
import { createDetailPageProject } from "@/lib/detail-page-project";

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/products/detail-page/sections/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analysisHistoryId: "analysis-1",
      eventType: "generate-click",
      expectedRevision: 1,
      navigationType: "reload",
      pagePhase: "build",
      sectionId: "section-1",
      ...body,
    }),
  });
}

describe("detail page generation intent route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const project = createDetailPageProject({
      analysisHistoryId: "analysis-1",
      idFactory: (() => { let index = 0; return () => `section-${++index}`; })(),
      projectId: "project-1",
      sectionCount: 5,
      sourceAssetId: "asset-source",
      userId: "user-1",
    });
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.createIntent.mockResolvedValue({
      intent: { id: "random-server-intent" },
      project: { ...project, revision: 2 },
      section: project.sections[0],
    });
  });

  it("requires authentication", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.createIntent).not.toHaveBeenCalled();
  });

  it("creates an authenticated section-scoped intent without a requestId", async () => {
    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.intentId).toBe("random-server-intent");
    expect(mocks.createIntent).toHaveBeenCalledWith(expect.objectContaining({
      analysisHistoryId: "analysis-1",
      eventType: "generate-click",
      expectedRevision: 1,
      navigationType: "reload",
      pagePhase: "build",
      sectionId: "section-1",
      userId: "user-1",
    }));
    expect(mocks.logTrigger).toHaveBeenCalledOnce();
  });

  it.each(["generate-click", "retry-click", "regenerate-click"])("accepts explicit event %s", async (eventType) => {
    const response = await POST(makeRequest({ eventType }));
    expect(response.status).toBe(200);
  });

  it("rejects non-explicit triggers and malformed revisions", async () => {
    expect((await POST(makeRequest({ eventType: "mount" }))).status).toBe(400);
    expect((await POST(makeRequest({ expectedRevision: 0 }))).status).toBe(400);
    expect(mocks.createIntent).not.toHaveBeenCalled();
  });
});
