import { describe, expect, it } from "vitest";
import { clearProductSessionStorage } from "@/lib/product-session-storage";

describe("clearProductSessionStorage", () => {
  it("clears product context and preserves device preferences", () => {
    const values = new Map([
      ["cloudai:products:last-analysis-history-id", "analysis-a"],
      ["cloudai:products:generation-brief:analysis-a", "brief"],
      ["cloudai:products:output-settings:analysis-a", "settings"],
      ["cloudai-theme", "business-light"],
      ["cloudai-sidebar-collapsed", "true"],
    ]);
    const storage = {
      get length() {
        return values.size;
      },
      key(index: number) {
        return Array.from(values.keys())[index] || null;
      },
      removeItem(key: string) {
        values.delete(key);
      },
    } as Storage;

    clearProductSessionStorage(storage);

    expect(Array.from(values.entries())).toEqual([
      ["cloudai-theme", "business-light"],
      ["cloudai-sidebar-collapsed", "true"],
    ]);
  });
});
