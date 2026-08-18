import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildProductDetailPageImagePrompt } from "../product-detail-page-image-prompt-builder";
import { buildProductDetailPagePlanPrompt, type ProductDetailPagePlanPage } from "../product-detail-page-plan-prompt-builder";
import { buildProductImageEditPrompt } from "../product-image-edit-prompt-builder";
import { buildProductImageSetImagePrompt } from "../product-image-set-image-prompt-builder";
import { buildProductImageSetPlanPrompt, type ProductImageSetPlanImage } from "../product-image-set-plan-prompt-builder";
import { buildProductSceneEditPrompt } from "../product-scene-prompt-builder";
import { PRODUCT_GENERATION_RULES_BLOCK } from "../product-generation-rules";
import { buildProductVisualFidelityPrompt } from "../product-visual-fidelity-prompt-builder";
import { buildCopywritingPrompt } from "../../prompts";
import type { ProductGenerationBrief, ProductImageAnalysis } from "../../product-types";

const mockAnalysis: ProductImageAnalysis = {
  category: "键盘",
  color: "粉蓝配色",
  colors: ["粉蓝配色", "粉色背光"],
  features: ["粉蓝配色", "右下角卡通图案"],
  material: "塑料与金属质感",
  materials: ["塑料", "金属质感"],
  productNameSuggestions: ["粉蓝机械键盘"],
  risks: ["品牌授权信息需要用户确认"],
  scenes: ["桌搭", "办公"],
  sellingPoints: ["可爱桌搭氛围", "粉色背光"],
  targetAudience: "桌搭爱好者",
  visualStyle: "柔和电商视觉",
  mustKeepDetails: ["键位布局", "右下角卡通图案"],
  avoidChanges: ["不要改变卡通图案位置", "不要重排键位"],
  detailPageHints: {
    detailAngles: ["键帽字符", "线材接口"],
    usageScenes: ["桌面场景"],
    visualMood: "可爱柔和",
  },
};

const mockBrief: ProductGenerationBrief = {
  avoidChanges: ["不要新增官方认证"],
  coreSellingPoints: ["可爱桌搭氛围"],
  extraRequirements: "不要写正品保证。",
  mustKeepDetails: ["保留卡通图案"],
  productName: "粉蓝机械键盘",
  riskConfirmations: {
    complianceNotes: "品牌授权信息需要用户确认。",
    confirmedBrandClaims: "",
    forbiddenClaims: "不要生成官方授权、正品保证、官方认证、行业第一、100%。",
  },
  styleRequirements: "柔和、干净、保真",
  targetAudience: "桌搭爱好者",
  usageScenarios: ["办公桌搭"],
};

const mockDetailPage: ProductDetailPagePlanPage = {
  bodyCopy: "保留商品结构，展示核心细节。",
  headline: "柔和桌搭氛围",
  notes: "文字简短。",
  pageIndex: 1,
  sectionTitle: "首屏主视觉",
  sectionType: "hero",
  sellingPoint: "粉蓝配色与粉色背光",
  subheadline: "适合可爱办公桌面",
  visualDirection: "商品居中，背景简洁，保留键帽字符和卡通图案。",
};

const mockImageSetImage: ProductImageSetPlanImage = {
  avoid: ["不要改变商品结构"],
  goal: "传递核心价值并吸引点击",
  headline: "粉蓝桌搭主视觉",
  imageIndex: 1,
  imageType: "hero",
  keyMessage: "可爱、柔和、保留商品细节",
  mustKeep: ["键盘布局", "卡通图案"],
  requiredElements: ["商品主体", "粉色背光"],
  subheadline: "适合办公和桌搭",
  suggestedGenerationMode: "faithful",
  title: "首屏主视觉",
  visualDirection: "干净桌面背景，商品主体清晰。",
};

function expectCoreGenerationRules(prompt: string) {
  expect(prompt).toContain("不得编造");
  expect(prompt).toContain("官方授权");
  expect(prompt).toContain("正品保证");
  expect(prompt).toContain("绝对化");
  expect(prompt).toContain("保持商品主体一致");
}

function expectVisualRules(prompt: string) {
  expect(prompt).toContain("保持商品主体一致");
  expect(prompt).toContain("自行添加新 Logo");
  expect(prompt).toContain("认证/授权文字");
}

describe("product generation rules coverage", () => {
  it("keeps core rule block complete", () => {
    expectCoreGenerationRules(PRODUCT_GENERATION_RULES_BLOCK);
  });

  it("includes generation rules in product copywriting prompt", () => {
    const prompt = buildCopywritingPrompt({
      generationMode: "single",
      goal: "conversion",
      outputType: "description",
      platform: "taobao",
      productName: "粉蓝机械键盘",
      productType: "数码外设",
      sellingPoints: "粉蓝配色，粉色背光",
      tone: "专业",
    });

    expectCoreGenerationRules(prompt);
  });

  it("keeps conservative brand rules in product analysis prompt source", () => {
    const source = readFileSync(join(process.cwd(), "lib/ai/providers/dashscope-vision.ts"), "utf8");

    expect(source).toContain("PRODUCT_GENERATION_RULES_BLOCK");
    expect(source).toContain("图片中可见");
    expect(source).toContain("不得写");
    expect(source).toContain("官方授权");
  });

  it("includes generation rules in detail page plan prompt", () => {
    const prompt = buildProductDetailPagePlanPrompt({
      analysis: mockAnalysis,
      copywritingRecords: [],
      count: 3,
      generationBrief: mockBrief,
      productTitle: "粉蓝机械键盘",
      style: "ecommerce",
    });

    expectCoreGenerationRules(prompt);
  });

  it("includes generation rules in image set plan prompt", () => {
    const prompt = buildProductImageSetPlanPrompt({
      analysis: mockAnalysis,
      count: 5,
      generationBrief: mockBrief,
      productTitle: "粉蓝机械键盘",
      purpose: "detail-page",
    });

    expectCoreGenerationRules(prompt);
  });

  it("includes visual fidelity rules in detail page image prompt", () => {
    const prompt = buildProductDetailPageImagePrompt({
      analysis: mockAnalysis,
      generationBrief: mockBrief,
      page: mockDetailPage,
      productTitle: "粉蓝机械键盘",
      style: "ecommerce",
    });

    expectVisualRules(prompt);
    expect(prompt).toContain("官方授权");
    expect(prompt).toContain("绝对化");
  });

  it("includes visual fidelity rules in image set image prompt", () => {
    const prompt = buildProductImageSetImagePrompt({
      analysis: mockAnalysis,
      generationBrief: mockBrief,
      generationMode: "faithful",
      image: mockImageSetImage,
      productTitle: "粉蓝机械键盘",
      purpose: "detail-page",
    });

    expectVisualRules(prompt);
    expect(prompt).toContain("官方授权");
    expect(prompt).toContain("绝对化");
  });

  it("includes visual fidelity rules in scene image prompt", () => {
    const prompt = buildProductSceneEditPrompt({
      analysis: mockAnalysis,
      platform: "taobao",
      scene: "桌搭场景",
      style: "lifestyle",
    });

    expectVisualRules(prompt);
    expect(prompt).toContain("官方授权");
    expect(prompt).toContain("绝对化");
  });

  it("includes visual fidelity rules in visual fidelity helper", () => {
    const prompt = buildProductVisualFidelityPrompt({
      analysis: mockAnalysis,
      generationMode: "faithful",
    });

    expectVisualRules(prompt);
  });

  it("includes visual fidelity rules in product image edit prompt", () => {
    const prompt = buildProductImageEditPrompt({
      goalId: "main-image",
      userPrompt: "保持商品原有图案。",
    });

    expectVisualRules(prompt);
    expect(prompt).toContain("官方授权");
  });
});
