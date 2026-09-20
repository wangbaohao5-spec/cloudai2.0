import {
  DETAIL_PAGE_EXPORT_LIMITS,
  DETAIL_PAGE_EXPORT_TIMEOUT_MS,
  DetailPageExportReadinessError,
  getDetailPageExportFilename,
  getDetailPageExportSelection,
  getDetailPageSectionExportBlockers,
  sanitizeDetailPageExportSlug,
  withDetailPageExportTimeout,
} from "@/lib/detail-page-export";
import { createFallbackDetailPageProject, type DetailPageProjectV2, type DetailPageSectionV2 } from "@/lib/detail-page-project";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
});

function project() {
  let id = 0;
  return createFallbackDetailPageProject({
    analysisHistoryId: "analysis-1",
    idFactory: () => `section-${++id}`,
    projectId: "project-1",
    sectionCount: 7,
    sourceAssetId: "source-asset",
    userId: "user-1",
  });
}

function exportableProject() {
  const value = project();
  return {
    ...value,
    sections: value.sections.map((section) => {
      if (["USAGE_GUIDE", "SPECS"].includes(section.moduleType)) {
        return { ...section, readiness: "READY" as const, copy: { headline: "确认标题", body: "确认正文" } };
      }
      return {
        ...section,
        readiness: "EXISTING_ASSET" as const,
        lifecycle: "COMPLETE" as const,
        selectedAssetId: `asset-${section.id}`,
        assetSource: "existing-asset" as const,
      };
    }),
  };
}

function replaceSection(value: DetailPageProjectV2, sectionId: string, update: Partial<DetailPageSectionV2>) {
  return { ...value, sections: value.sections.map((section) => section.id === sectionId ? { ...section, ...update } : section) };
}

describe("Detail Page V2 export contract", () => {
  it("uses project order for full export", () => {
    const value = exportableProject();
    value.sections = [value.sections[1], value.sections[0], ...value.sections.slice(2)].map((section, index) => ({ ...section, order: index + 1 }));
    expect(getDetailPageExportSelection(value, "full").slice(0, 2).map((section) => section.id)).toEqual(["section-2", "section-1"]);
  });

  it("omits hidden sections", () => {
    const value = replaceSection(exportableProject(), "section-2", { hidden: true });
    expect(getDetailPageExportSelection(value, "full").map((section) => section.id)).not.toContain("section-2");
  });

  it("does not let a hidden incomplete section block full export", () => {
    const value = replaceSection(exportableProject(), "section-2", { hidden: true, readiness: "NEEDS_INPUT", lifecycle: "FAILED" });
    expect(() => getDetailPageExportSelection(value, "full")).not.toThrow();
  });

  it.each([
    [{ readiness: "NEEDS_INPUT" }, "NEEDS_INPUT"],
    [{ lifecycle: "FAILED" }, "FAILED"],
    [{ lifecycle: "GENERATING" }, "PROJECT_BUSY"],
  ] as Array<[Partial<DetailPageSectionV2>, string]>)("blocks visible invalid state %s", (update, reason) => {
    const value = replaceSection(exportableProject(), "section-1", update);
    expect(() => getDetailPageExportSelection(value, "full")).toThrowError(DetailPageExportReadinessError);
    try {
      getDetailPageExportSelection(value, "full");
    } catch (error) {
      expect((error as DetailPageExportReadinessError).blockingSections.map((item) => item.reasonCode)).toContain(reason);
    }
  });

  it("blocks a visual section without a selected Asset", () => {
    const section = { ...exportableProject().sections[0], selectedAssetId: null };
    expect(getDetailPageSectionExportBlockers(section).map((item) => item.reasonCode)).toContain("MISSING_ASSET");
  });

  it("rejects an unsupported module layout", () => {
    const section = { ...exportableProject().sections[0], layout: "STEP_TEXT" as DetailPageSectionV2["layout"] };
    expect(getDetailPageSectionExportBlockers(section).map((item) => item.reasonCode)).toContain("UNSUPPORTED_LAYOUT");
  });

  it("requires verified text modules to contain headline and body", () => {
    const section = { ...exportableProject().sections.find((item) => item.moduleType === "SPECS")!, copy: { headline: "", body: "" } };
    expect(getDetailPageSectionExportBlockers(section).map((item) => item.reasonCode)).toContain("COPY_REQUIRED");
  });

  it("allows a complete section slice even when another section is incomplete", () => {
    const value = replaceSection(exportableProject(), "section-2", { readiness: "NEEDS_INPUT" });
    expect(getDetailPageExportSelection(value, "section", "section-1")).toHaveLength(1);
  });

  it("denies an incomplete section slice", () => {
    const value = replaceSection(exportableProject(), "section-1", { lifecycle: "FAILED" });
    expect(() => getDetailPageExportSelection(value, "section", "section-1")).toThrowError(DetailPageExportReadinessError);
  });

  it("denies hidden and missing section slices", () => {
    const value = replaceSection(exportableProject(), "section-1", { hidden: true });
    expect(() => getDetailPageExportSelection(value, "section", "section-1")).toThrow("已隐藏模块不能导出切片");
    expect(() => getDetailPageExportSelection(value, "section", "missing")).toThrow("该详情页模块不存在");
  });

  it("blocks full export when a hidden generation still owns the project busy token", () => {
    const value = replaceSection(exportableProject(), "section-1", { hidden: true, lifecycle: "GENERATING" });
    expect(() => getDetailPageExportSelection(value, "full")).toThrow("当前详情页仍在制作");
  });

  it("allows a stable slice while another section is generating", () => {
    const value = replaceSection(exportableProject(), "section-2", { lifecycle: "GENERATING" });
    expect(getDetailPageExportSelection(value, "section", "section-1")[0].id).toBe("section-1");
  });

  it("rejects an empty visible assembly", () => {
    const value = { ...exportableProject(), sections: exportableProject().sections.map((section) => ({ ...section, hidden: true })) };
    expect(() => getDetailPageExportSelection(value, "full")).toThrowError(DetailPageExportReadinessError);
  });

  it("enforces the section count resource limit", () => {
    const value = exportableProject();
    value.sections = Array.from({ length: DETAIL_PAGE_EXPORT_LIMITS.maxSections + 1 }, (_, index) => ({ ...value.sections[0], id: `section-${index}`, order: index + 1 }));
    expect(() => getDetailPageExportSelection(value, "full")).toThrowError(DetailPageExportReadinessError);
  });

  it("sanitizes full and slice filenames", () => {
    expect(sanitizeDetailPageExportSlug("../\r\n 测试 商品 <script>")).toBe("script");
    expect(getDetailPageExportFilename("测试商品", "full")).toBe("vahoro-detail-page-product.jpg");
    expect(getDetailPageExportFilename("ignored", "section", exportableProject().sections[0])).toBe("01-hero.jpg");
  });

  it("never allows unsafe header characters in a full filename", () => {
    expect(getDetailPageExportFilename("A\r\nContent-Type: text/html", "full")).toMatch(/^vahoro-detail-page-[a-z0-9-]+\.jpg$/);
  });

  it("uses an independent timeout and aborts remaining export work", async () => {
    vi.useFakeTimers();
    let taskAborted = false;
    const result = withDetailPageExportTimeout(async (signal) => {
      signal.addEventListener("abort", () => {
        taskAborted = true;
      }, { once: true });
      await new Promise(() => undefined);
      return "unreachable";
    });

    const assertion = expect(result).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(DETAIL_PAGE_EXPORT_TIMEOUT_MS);
    await assertion;
    expect(taskAborted).toBe(true);
  });
});
