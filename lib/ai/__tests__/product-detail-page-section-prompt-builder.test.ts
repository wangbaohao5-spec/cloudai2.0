import { describe, expect, it } from "vitest";
import { buildProductDetailPageSectionPrompt } from "@/lib/ai/product-detail-page-section-prompt-builder";
import { createDetailPageProject, getDefaultDetailPageStyle, type DetailPageModuleType } from "@/lib/detail-page-project";

function makeSection(moduleType: DetailPageModuleType) {
  const project = createDetailPageProject({
    analysisHistoryId: "analysis-1",
    candidate: { sections: [{ moduleType }] },
    idFactory: () => "section-1",
    projectId: "project-1",
    sectionCount: 5,
    sourceAssetId: "asset-source",
    userId: "user-1",
  });

  return { ...project.sections[0], moduleType };
}

describe("detail page V2 section visual prompt", () => {
  it.each(["HERO", "USAGE_SCENE", "PRODUCT_DETAIL", "BRAND_CONTENT", "BENEFITS"] as const)(
    "provides module-specific semantics for %s",
    (moduleType) => {
      const prompt = buildProductDetailPageSectionPrompt({
        pageStyle: getDefaultDetailPageStyle("brand-site"),
        productTitle: "测试商品",
        section: makeSection(moduleType),
      });

      expect(prompt).toContain(`Section module: ${moduleType}`);
      expect(prompt).toContain("uploaded product image is the sole canonical product identity reference");
    },
  );

  it("inherits every shared page style role", () => {
    const pageStyle = getDefaultDetailPageStyle("minimal");
    const prompt = buildProductDetailPageSectionPrompt({ pageStyle, productTitle: "测试商品", section: makeSection("HERO") });

    expect(prompt).toContain(`Preset: ${pageStyle.preset}`);
    expect(prompt).toContain(pageStyle.mood);
    expect(prompt).toContain(pageStyle.palette);
    expect(prompt).toContain(pageStyle.lighting);
    expect(prompt).toContain(pageStyle.typography);
    expect(prompt).toContain(pageStyle.spacing);
  });

  it("keeps draft copy as non-factual context and forbids rendering it", () => {
    const section = makeSection("HERO");
    section.copy = { headline: "未经确认的超强功效", body: "这是编辑中的正文" };
    const prompt = buildProductDetailPageSectionPrompt({ pageStyle: getDefaultDetailPageStyle(), productTitle: "测试商品", section });

    expect(prompt).toContain("Editorial copy context only, not verified evidence");
    expect(prompt).toContain("NO added advertising typography");
    expect(prompt).toContain("NO campaign headline");
    expect(prompt).toContain("NO specification table");
  });

  it("promotes only user-verified evidence", () => {
    const section = makeSection("BENEFITS");
    section.evidence.push(
      { field: "confirmed-benefits", sourceType: "user-confirmed", value: "人工确认卖点", verifiedByUser: true },
      { field: "analysis-guess", sourceType: "product-brief", value: "AI 推测卖点", verifiedByUser: false },
    );
    const prompt = buildProductDetailPageSectionPrompt({ pageStyle: getDefaultDetailPageStyle(), productTitle: "测试商品", section });

    expect(prompt).toContain("人工确认卖点");
    expect(prompt).not.toContain("AI 推测卖点");
  });

  it.each(["USAGE_GUIDE", "SPECS"] as const)("rejects structured-only module %s", (moduleType) => {
    expect(() =>
      buildProductDetailPageSectionPrompt({
        pageStyle: getDefaultDetailPageStyle(),
        productTitle: "测试商品",
        section: makeSection(moduleType),
      }),
    ).toThrow("does not support visual generation");
  });
});
