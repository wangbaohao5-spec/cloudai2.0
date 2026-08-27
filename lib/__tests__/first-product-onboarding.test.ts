import {
  activateFirstProductOnboarding,
  dismissFirstProductOnboarding,
  getFirstProductDashboardOnboarding,
  getFirstProductOnboardingStatus,
  getFirstProductOnboardingStorageKey,
  getFirstProductStartAction,
  getFirstProductWorkspaceGuideStage,
} from "@/lib/first-product-onboarding";
import { describe, expect, it } from "vitest";

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("first product onboarding", () => {
  it("shows the first-product Dashboard CTA when no product analysis exists", () => {
    expect(getFirstProductDashboardOnboarding(true)).toEqual(expect.objectContaining({
      actionLabel: "开始创建商品",
      href: "/dashboard/products/new",
    }));
  });

  it("keeps the existing Dashboard for users with a product analysis", () => {
    expect(getFirstProductDashboardOnboarding(false)).toBeNull();
  });

  it("keeps the Start Workspace upload instruction explicit", () => {
    expect(getFirstProductStartAction({ hasUploadedAsset: false, isAnalyzing: false, isUploading: false })).toEqual(expect.objectContaining({
      buttonLabel: "分析商品",
      statusDescription: "请先上传一张清晰的商品主图。",
    }));
  });

  it("shows the analysis CTA after upload succeeds", () => {
    expect(getFirstProductStartAction({ hasUploadedAsset: true, isAnalyzing: false, isUploading: false })).toEqual(expect.objectContaining({
      buttonLabel: "分析商品",
      statusLabel: "商品图已上传",
    }));
  });

  it("shows an honest analysis loading state", () => {
    expect(getFirstProductStartAction({ hasUploadedAsset: true, isAnalyzing: true, isUploading: false }).buttonLabel).toBe("正在分析商品…");
  });

  it("recommends core actions after product analysis", () => {
    expect(getFirstProductWorkspaceGuideStage({ enabled: true, dismissed: false, copywritingCount: 0, imageCount: 0 })).toBe("analysis-complete");
  });

  it("recommends an image action after copywriting succeeds", () => {
    expect(getFirstProductWorkspaceGuideStage({ enabled: true, dismissed: false, copywritingCount: 1, imageCount: 0 })).toBe("copywriting-complete");
  });

  it("ends the visible onboarding after the first image succeeds", () => {
    expect(getFirstProductWorkspaceGuideStage({ enabled: true, dismissed: false, copywritingCount: 0, imageCount: 1 })).toBeNull();
  });

  it("allows a lightweight package hint when copywriting and an image both exist", () => {
    expect(getFirstProductWorkspaceGuideStage({ enabled: true, dismissed: false, copywritingCount: 1, imageCount: 1 })).toBe("package-ready");
  });

  it("does not repeat dismissed guidance", () => {
    expect(getFirstProductWorkspaceGuideStage({ enabled: true, dismissed: true, copywritingCount: 0, imageCount: 0 })).toBeNull();
  });

  it("isolates active and dismissed state by stable user id", () => {
    const storage = createStorage();

    activateFirstProductOnboarding(storage, "user-a");
    dismissFirstProductOnboarding(storage, "user-a");
    activateFirstProductOnboarding(storage, "user-b");

    expect(getFirstProductOnboardingStorageKey("user-a")).not.toBe(getFirstProductOnboardingStorageKey("user-b"));
    expect(getFirstProductOnboardingStatus(storage, "user-a")).toBe("dismissed");
    expect(getFirstProductOnboardingStatus(storage, "user-b")).toBe("active");
  });
});
