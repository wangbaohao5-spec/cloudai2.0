import { describe, expect, it, vi } from "vitest";
import { handleUnauthorizedResponse } from "@/lib/authenticated-fetch";

function createStorage() {
  const values = new Map([
    ["cloudai:products:last-analysis-history-id", "analysis-a"],
    ["cloudai:products:generation-brief:analysis-a", "brief"],
    ["cloudai-theme", "business-light"],
    ["cloudai-sidebar-collapsed", "true"],
  ]);
  return {
    values,
    storage: {
      get length() { return values.size; },
      key(index: number) { return Array.from(values.keys())[index] || null; },
      removeItem(key: string) { values.delete(key); },
    } as Storage,
  };
}

describe("protected client request handling", () => {
  it("clears product state and redirects on 401 while preserving preferences", () => {
    const { storage, values } = createStorage();
    const redirect = vi.fn();
    expect(handleUnauthorizedResponse(new Response(null, { status: 401 }), { storage, redirect })).toBe(true);
    expect(redirect).toHaveBeenCalledWith("/login?reason=session-expired");
    expect(Array.from(values.entries())).toEqual([
      ["cloudai-theme", "business-light"],
      ["cloudai-sidebar-collapsed", "true"],
    ]);
  });

  it("does not clear or redirect for a missing resource", () => {
    const { storage, values } = createStorage();
    const redirect = vi.fn();
    expect(handleUnauthorizedResponse(new Response(null, { status: 404 }), { storage, redirect })).toBe(false);
    expect(values.has("cloudai:products:last-analysis-history-id")).toBe(true);
    expect(redirect).not.toHaveBeenCalled();
  });
});
