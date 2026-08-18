import { describe, expect, it } from "vitest";

import { scanProductContentRisk, type ProductContentRiskCategory, type ProductContentRiskScanResult } from "../product-content-risk-scanner";

function getKeywords(result: ProductContentRiskScanResult) {
  return result.matches.map((match) => match.keyword);
}

function expectKeywords(result: ProductContentRiskScanResult, keywords: string[]) {
  const actualKeywords = getKeywords(result);

  for (const keyword of keywords) {
    expect(actualKeywords).toContain(keyword);
  }
}

function expectKeywordCategory(result: ProductContentRiskScanResult, keyword: string, category: ProductContentRiskCategory) {
  expect(result.matches.find((match) => match.keyword === keyword)?.category).toBe(category);
}

describe("scanProductContentRisk", () => {
  it("returns none for empty input", () => {
    const result = scanProductContentRisk("");

    expect(result.level).toBe("none");
    expect(result.matches).toEqual([]);
  });

  it("does not report safe product expressions", () => {
    const result = scanProductContentRisk("适合日常通勤，突出面料质感，呈现商品细节，帮助用户理解卖点。");

    expect(result.level).toBe("none");
    expect(result.matches).toEqual([]);
  });

  it("detects brand authorization claims", () => {
    const result = scanProductContentRisk("这是官方授权商品，支持品牌联名。");

    expectKeywords(result, ["官方授权", "品牌联名"]);
    expectKeywordCategory(result, "官方授权", "brand-authorization");
    expectKeywordCategory(result, "品牌联名", "brand-authorization");
    expect(["medium", "high"]).toContain(result.level);
  });

  it("detects official product and guarantee claims", () => {
    const result = scanProductContentRisk("官方正品，正品保证，假一赔十。");

    expectKeywords(result, ["官方正品", "正品保证", "假一赔十"]);
    expectKeywordCategory(result, "官方正品", "guarantee-claim");
    expectKeywordCategory(result, "正品保证", "guarantee-claim");
    expectKeywordCategory(result, "假一赔十", "guarantee-claim");
  });

  it("detects certification and testing claims", () => {
    const result = scanProductContentRisk("通过国家认证，拥有检测报告和专利技术。");

    expectKeywords(result, ["国家认证", "检测报告", "专利技术"]);
    expectKeywordCategory(result, "国家认证", "certification");
    expectKeywordCategory(result, "检测报告", "certification");
    expectKeywordCategory(result, "专利技术", "certification");
  });

  it("detects absolute marketing claims", () => {
    const result = scanProductContentRisk("行业第一，100% 有效，永久耐用，全球领先。");

    expectKeywords(result, ["行业第一", "100%", "永久", "全球领先"]);
    expectKeywordCategory(result, "行业第一", "absolute-claim");
    expectKeywordCategory(result, "100%", "absolute-claim");
    expectKeywordCategory(result, "永久", "absolute-claim");
    expectKeywordCategory(result, "全球领先", "absolute-claim");
  });

  it("detects medical and efficacy claims", () => {
    const result = scanProductContentRisk("医疗级护理，可以治疗问题肌，立刻见效。");

    expectKeywords(result, ["医疗级", "治疗", "立刻见效"]);
    expectKeywordCategory(result, "医疗级", "medical-claim");
    expectKeywordCategory(result, "治疗", "medical-claim");
    expectKeywordCategory(result, "立刻见效", "medical-claim");
  });

  it("detects sales and review claims", () => {
    const result = scanProductContentRisk("销量第一，全网第一，万人推荐，用户一致好评。");

    expectKeywords(result, ["销量第一", "全网第一", "万人推荐", "用户一致好评"]);
    expectKeywordCategory(result, "销量第一", "sales-claim");
    expectKeywordCategory(result, "全网第一", "sales-claim");
    expectKeywordCategory(result, "万人推荐", "sales-claim");
    expectKeywordCategory(result, "用户一致好评", "sales-claim");
  });

  it("deduplicates repeated keywords", () => {
    const result = scanProductContentRisk("官方授权，官方授权，官方授权。");

    expect(getKeywords(result).filter((keyword) => keyword === "官方授权")).toHaveLength(1);
  });

  it("reports high level for mixed high-risk content across categories", () => {
    const result = scanProductContentRisk("MLB 官方授权，行业第一，100% 正品保证，医疗级护理。");
    const categories = new Set(result.matches.map((match) => match.category));

    expectKeywords(result, ["官方授权", "行业第一", "100%", "正品保证", "医疗级"]);
    expect(categories.size).toBeGreaterThanOrEqual(4);
    expect(result.level).toBe("high");
  });
});
