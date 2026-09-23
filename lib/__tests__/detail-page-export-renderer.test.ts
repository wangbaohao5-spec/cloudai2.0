import { ApiError } from "@/lib/api-errors";
import {
  DETAIL_PAGE_EXPORT_LIMITS,
} from "@/lib/detail-page-export";
import {
  composeDetailPageExport,
  encodeDetailPageSection,
  escapeDetailPageSvgText,
  getDetailPageExportContentType,
  getDetailPageSectionRenderPlan,
  renderDetailPageSection,
  tokenizeDetailPageText,
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
  return sharp({ create: { width, height, channels: 3, background: "#204060" } }).jpeg().toBuffer();
}

describe("Detail Page V2 export renderer", () => {
  it("escapes user text before SVG interpolation", () => {
    expect(escapeDetailPageSvgText(`<script x="1">A&B's</script>`)).toBe("&lt;script x=&quot;1&quot;&gt;A&amp;B&apos;s&lt;/script&gt;");
  });

  it("wraps Chinese text deterministically", () => {
    expect(wrapDetailPageText("温和洁面真实商品", 4, 4)).toEqual(["温和洁面", "真实商品"]);
  });

  it("keeps normal English words intact and wraps at spaces", () => {
    expect(wrapDetailPageText("mild soap cleanser", 6, 3)).toEqual(["mild soap", "cleanser"]);
    expect(wrapDetailPageText("freeplus", 4.5, 2)).toEqual(["freeplus"]);
  });

  it("wraps mixed Chinese and English text without splitting words", () => {
    expect(wrapDetailPageText("freeplus mild soap 洁面软管", 8, 3)).toEqual(["freeplus mild", "soap 洁面软管"]);
  });

  it("keeps closing punctuation with the preceding token when possible", () => {
    expect(tokenizeDetailPageText("freeplus, 温和洁面。")).toEqual(["freeplus,", " ", "温", "和", "洁", "面。"]);
    const lines = wrapDetailPageText("温和洁面，真实商品。", 4, 3);
    expect(lines).toEqual(["温和洁", "面，真实", "商品。"]);
    expect(lines.every((line) => !/^[，。！？：；、）》】」』…]/.test(line))).toBe(true);
  });

  it("keeps common number and unit forms together", () => {
    expect(tokenizeDetailPageText("100 ml 1200px 2-in-1 24H")).toEqual(["100 ml", " ", "1200px", " ", "2-in-1", " ", "24H"]);
    expect(wrapDetailPageText("规格 100 ml 24H", 5, 3)).toEqual(["规格", "100 ml", "24H"]);
  });

  it("falls back to character wrapping only for an oversized unbroken token", () => {
    expect(wrapDetailPageText("supercalifragilistic", 3, 5)).toEqual(["super", "calif", "ragil", "istic"]);
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
    const encoded = await encodeDetailPageSection(rendered);
    const metadata = await sharp(encoded).metadata();

    expect(encoded.byteLength).toBeGreaterThan(0);
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(1_200);
    expect(metadata.height).toBe(getDetailPageSectionRenderPlan(section).height);
  });

  it("renders mixed-language Hero copy through the token-aware wrapper", async () => {
    const section = exportable(sections()[0], {
      copy: {
        headline: "freeplus mild soap 洁面软管",
        body: "白色软管主体，正面 freeplus 与 mild soap 排版完整。",
      },
    });
    const rendered = await renderDetailPageSection({ assetBuffer: await source(), pageStyle: "ecommerce", section });
    const encoded = await encodeDetailPageSection(rendered);
    const metadata = await sharp(encoded).metadata();

    expect(wrapDetailPageText(section.copy.headline, 8, 3)).toEqual(["freeplus mild", "soap 洁面软管"]);
    expect(encoded.byteLength).toBeGreaterThan(0);
    expect(metadata.height).toBe(getDetailPageSectionRenderPlan(section).height);
  });

  it("renders and composes five sections within the bounded export contract", async () => {
    const startedAt = performance.now();
    const input = await source(360, 640);
    const rendered = [];

    for (const section of sections().slice(0, 5)) {
      rendered.push(await renderDetailPageSection({
        assetBuffer: input,
        pageStyle: "ecommerce",
        section: exportable(section),
      }));
    }

    const output = await composeDetailPageExport(rendered, "ecommerce");
    const metadata = await sharp(output).metadata();
    const expectedHeight = rendered.reduce((total, section) => total + section.height, 0);

    expect(performance.now() - startedAt).toBeLessThan(5_000);
    expect(output.byteLength).toBeGreaterThan(0);
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(DETAIL_PAGE_EXPORT_LIMITS.width);
    expect(metadata.height).toBe(expectedHeight);
    expect(expectedHeight).toBeLessThanOrEqual(DETAIL_PAGE_EXPORT_LIMITS.maxTotalHeight);
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
    expect(rendered.width).toBe(DETAIL_PAGE_EXPORT_LIMITS.width);
  });

  it("uses contain padding instead of stretching a portrait product asset", async () => {
    const section = exportable(sections()[0]);
    const rendered = await renderDetailPageSection({ assetBuffer: await source(120, 600), pageStyle: "ecommerce", section });
    const sample = (x: number, y: number) => Array.from(rendered.buffer.subarray((y * rendered.width + x) * rendered.channels, (y * rendered.width + x) * rendered.channels + 3));
    const edge = sample(20, 300);
    const center = sample(600, 300);

    expect(Math.abs(edge[0] - center[0]) + Math.abs(edge[1] - center[1]) + Math.abs(edge[2] - center[2])).toBeGreaterThan(12);
  });

  it("reports observable CJK render timing without exposing copy", async () => {
    const section = exportable(sections()[0], { copy: { headline: "温和洁面", body: "真实商品，清晰呈现。" } });
    const timings: Array<Record<string, number>> = [];
    await renderDetailPageSection({
      assetBuffer: await source(),
      pageStyle: "ecommerce",
      section,
      onTiming: (timing) => timings.push(timing),
    });

    expect(timings).toHaveLength(1);
    expect(timings[0]).toEqual(expect.objectContaining({
      assetMetadataMs: expect.any(Number),
      imageDecodeMs: expect.any(Number),
      sectionRenderMs: expect.any(Number),
      textSvgBuildMs: expect.any(Number),
    }));
    expect(JSON.stringify(timings)).not.toContain("温和洁面");
  });

  it("caps PRODUCT_DETAIL media below the HERO canvas and preserves contain geometry", () => {
    const [hero, , , productDetail] = sections();
    const heroPlan = getDetailPageSectionRenderPlan(hero);
    const detailPlan = getDetailPageSectionRenderPlan(productDetail);

    expect(heroPlan.mediaRole).toBe("hero");
    expect(detailPlan.mediaRole).toBe("detail");
    expect(detailPlan.media?.width).toBeLessThan(DETAIL_PAGE_EXPORT_LIMITS.width);
    expect(detailPlan.media?.x).toBeGreaterThan(0);
    expect(detailPlan.media?.height).toBeLessThan(heroPlan.media?.height || Infinity);
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
    const red = Buffer.from(Array.from({ length: 1_200 * 20 }, () => [255, 0, 0, 255]).flat());
    const blue = Buffer.from(Array.from({ length: 1_200 * 20 }, () => [0, 0, 255, 255]).flat());
    const result = await composeDetailPageExport([
      { buffer: red, channels: 4, height: 20, sectionId: "red", width: 1_200 },
      { buffer: blue, channels: 4, height: 20, sectionId: "blue", width: 1_200 },
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
