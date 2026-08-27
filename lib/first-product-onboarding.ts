export const FIRST_PRODUCT_ONBOARDING_STORAGE_PREFIX = "cloudai:onboarding:first-product";

type OnboardingStorage = Pick<Storage, "getItem" | "setItem">;

export type FirstProductWorkspaceGuideStage = "analysis-complete" | "copywriting-complete" | "package-ready";

export function getFirstProductOnboardingStorageKey(userId: string) {
  return `${FIRST_PRODUCT_ONBOARDING_STORAGE_PREFIX}:${userId}`;
}

export function getFirstProductOnboardingStatus(storage: OnboardingStorage, userId: string) {
  return storage.getItem(getFirstProductOnboardingStorageKey(userId));
}

export function activateFirstProductOnboarding(storage: OnboardingStorage, userId: string) {
  const key = getFirstProductOnboardingStorageKey(userId);

  if (!storage.getItem(key)) {
    storage.setItem(key, "active");
  }
}

export function dismissFirstProductOnboarding(storage: OnboardingStorage, userId: string) {
  storage.setItem(getFirstProductOnboardingStorageKey(userId), "dismissed");
}

export function getFirstProductDashboardOnboarding(isFirstProductUser: boolean) {
  if (!isFirstProductUser) {
    return null;
  }

  return {
    title: "创建第一个商品",
    description: "上传一张商品图，CloudAI 会帮你完成商品分析、文案和视觉素材。",
    actionLabel: "开始创建商品",
    href: "/dashboard/products/new",
  };
}

export function getFirstProductStartAction({
  hasUploadedAsset,
  isAnalyzing,
  isUploading,
}: {
  hasUploadedAsset: boolean;
  isAnalyzing: boolean;
  isUploading: boolean;
}) {
  if (isUploading) {
    return {
      buttonLabel: "图片上传中...",
      statusLabel: "正在上传",
      statusDescription: "商品图片正在上传，请稍等。",
    };
  }

  if (isAnalyzing) {
    return {
      buttonLabel: "正在分析商品…",
      statusLabel: "正在分析商品…",
      statusDescription: "AI 正在识别商品信息、卖点和适合的上架方向，通常需要几十秒。",
    };
  }

  if (hasUploadedAsset) {
    return {
      buttonLabel: "分析商品",
      statusLabel: "商品图已上传",
      statusDescription: "AI 会识别商品信息、卖点和适合的上架方向。",
    };
  }

  return {
    buttonLabel: "分析商品",
    statusLabel: "未上传",
    statusDescription: "请先上传一张清晰的商品主图。",
  };
}

export function getFirstProductWorkspaceGuideStage({
  copywritingCount,
  dismissed,
  enabled,
  imageCount,
}: {
  copywritingCount: number;
  dismissed: boolean;
  enabled: boolean;
  imageCount: number;
}): FirstProductWorkspaceGuideStage | null {
  if (!enabled || dismissed) {
    return null;
  }

  if (copywritingCount > 0 && imageCount > 0) {
    return "package-ready";
  }

  if (imageCount > 0) {
    return null;
  }

  if (copywritingCount > 0) {
    return "copywriting-complete";
  }

  return "analysis-complete";
}
