import { ApiError } from "@/lib/api-errors";
import {
  DETAIL_PAGE_EXPORT_LIMITS,
} from "@/lib/detail-page-export";
import {
  composeDetailPageExport,
  escapeDetailPageSvgText,
  getDetailPageExportContentType,
  getDetailPageSectionRenderPlan,
  renderDetailPageSection,
  validateDetailPageCompositeBudget,
  wrapDetailPageText,
} from "@/lib/detail-page-export-renderer";
import { createFallbackDetailPageProject, type DetailPageSectionV2 } from "@/lib/detail-page-project";
import { getDetailPageStyleRole } from "@/lib/detail-page-preview";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

function sections() {
  let id = 0;
  return createFallbackDetailPageProject({
    analysisHistoryId: "analysis-1",
    idFactory: () => `section-${++id}`,
    projectId: "project-1",
    sectionCount: 7,
    sourceAssetId: "source-asset",
    userId: "user-1",
  }).sections;
}

function exportable(section: DetailPageSectionV2, update: Partial<DetailPageSectionV2> = {}) {
  return {
    ...section,
    lifecycle: "COMPLETE" as const,
    readiness: "EXISTING_ASSET" as const,
    selectedAssetId: "asset-1",
    assetSource: "existing-asset" as const,
    copy: { headline: "温和洁面", body: "清晰呈现商品信息与日常护理感。" },
    ...update,
  };
}

async function source(width = 300, height = 600) {
  return sharp({ create: { width, height, channels: 3, background: "#dde7e1" } }).jpeg().toBuffer();
}

describe("Detail Page V2 export renderer", () => {
  it("escapes user text before SVG interpolation", () => {
    expect(escapeDetailPageSvgText(`<script x="1">A&B's</script>`)).toBe("&lt;script x=&quot;1&quot;&gt;A&amp;B&apos;s&lt;/script&gt;");
  });

  it("wraps Chinese text deterministically", () => {
    expect(wrapDetailPageText("温和洁面真实商品", 4, 4)).toEqual(["温和洁面", "真实商品"]);
  });

  it("rejects text that cannot fit without silent truncation", () => {
    expect(() => wrapDetailPageText("很长的商品正文".repeat(80), 10, 3)).toThrow(ApiError);
  });

  it("renders every frozen layout to the 1200px contract", () => {
    for (const section of sections()) {
      const plan = getDetailPageSectionRenderPlan(section);
      expect(plan.height).toBeGreaterThan(0);
      expect(plan.height).toBeLessThanOrEqual(DETAIL_PAGE_EXPORT_LIMITS.maxSectionHeight);
      expect(plan.copy.x + plan.copy.width).toBeLessThanOrEqual(DETAIL_PAGE_EXPORT_LIMITS.width);
    }
  });

  it("rejects unsupported layout rendering", () => {
    const section = exportable(sections()[0], { layout: "STEP_TEXT" as DetailPageSectionV2["layout"] });
    expect(() => getDetailPageSectionRenderPlan(section)).toThrow("版式不受支持");
  });

  it("renders a CJK visual section without crashing", async () => {
    const section = exportable(sections()[0]);
    const rendered = await renderDetailPageSection({ assetBuffer: await source(), pageStyle: "ecommerce", section });
    const metadata = await sharp(rendered.buffer).metadata();

    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(1_200);
    expect(metadata.height).toBe(getDetailPageSectionRenderPlan(section).height);
  });

  it("uses the same deterministic section renderer for slices", async () => {
    const section = exportable(sections()[0]);
    const input = await source();
    const first = await renderDetailPageSection({ assetBuffer: input, pageStyle: "minimal", section });
    const second = await renderDetailPageSection({ assetBuffer: input, pageStyle: "minimal", section });
    expect(first.buffer.equals(second.buffer)).toBe(true);
  });

  it("normalizes portrait source images without changing the export width", async () => {
    const section = exportable(sections()[0]);
    const rendered = await renderDetailPageSection({ assetBuffer: await source(180, 720), pageStyle: "brand-site", section });
    expect((await sharp(rendered.buffer).metadata()).width).toBe(DETAIL_PAGE_EXPORT_LIMITS.width);
  });

  it("uses contain padding instead of stretching a portrait product asset", async () => {
    const section = exportable(sections()[0]);
    const rendered = await renderDetailPageSection({ assetBuffer: await source(120, 600), pageStyle: "ecommerce", section });
    const { data, info } = await sharp(rendered.buffer).raw().toBuffer({ resolveWithObject: true });
    const sample = (x: number, y: number) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
    const edge = sample(20, 300);
    const center = sample(600, 300);

    expect(Math.abs(edge[0] - center[0]) + Math.abs(edge[1] - center[1]) + Math.abs(edge[2] - center[2])).toBeGreaterThan(12);
  });

  it("rejects oversized source dimensions safely", async () => {
    const section = exportable(sections()[0]);
    const oversized = await source(DETAIL_PAGE_EXPORT_LIMITS.maxSourceDimension + 1, 1);
    await expect(renderDetailPageSection({ assetBuffer: oversized, pageStyle: "ecommerce", section })).rejects.toMatchObject({ status: 413 });
  });

  it("enforces total height and pixel budgets", () => {
    expect(() => validateDetailPageCompositeBudget([{ height: 1_600 }, { height: 1_600 }, { height: 1_600 }, { height: 1_600 }, { height: 1_600 }, { height: 1_600 }, { height: 1_600 }])).toThrow("总尺寸超出");
  });

  it("composes section buffers once in the supplied order", async () => {
    const red = await sharp({ create: { width: 1_200, height: 20, channels: 3, background: "#ff0000" } }).jpeg({ chromaSubsampling: "4:4:4" }).toBuffer();
    const blue = await sharp({ create: { width: 1_200, height: 20, channels: 3, background: "#0000ff" } }).jpeg({ chromaSubsampling: "4:4:4" }).toBuffer();
    const result = await composeDetailPageExport([
      { buffer: red, height: 20, sectionId: "red" },
      { buffer: blue, height: 20, sectionId: "blue" },
    ], "ecommerce");
    const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
    const first = Array.from(data.subarray(0, 3));
    const secondOffset = 25 * info.width * info.channels;
    const second = Array.from(data.subarray(secondOffset, secondOffset + 3));

    expect(info.width).toBe(1_200);
    expect(info.height).toBe(40);
    expect(first[0]).toBeGreaterThan(first[2]);
    expect(second[2]).toBeGreaterThan(second[0]);
  });

  it("maps pageStyle through the shared preview/export role", () => {
    expect(getDetailPageStyleRole("xiaohongshu")).toMatchObject({ className: "is-xiaohongshu", accent: "#8b574a" });
  });

  it("freezes JPEG as the response format", () => {
    expect(getDetailPageExportContentType()).toBe("image/jpeg");
  });
});
