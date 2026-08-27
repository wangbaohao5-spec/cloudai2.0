import { beforeEach, describe, expect, it, vi } from "vitest";

const VALID_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

const mocks = vi.hoisted(() => ({
  classifyUsageFailure: vi.fn((_error: unknown, fallback: string) => fallback),
  createAsset: vi.fn(),
  editImage: vi.fn(),
  finalizeUsage: vi.fn(),
  generateChatReply: vi.fn(),
  generateCopywriting: vi.fn(),
  generateImage: vi.fn(),
  generateText: vi.fn(),
  getAssetForUser: vi.fn(),
  getCurrentUser: vi.fn(),
  getFileUrl: vi.fn(),
  getHistoryRecordForUser: vi.fn(),
  getProductRelatedHistory: vi.fn(),
  getTextProviderModelId: vi.fn(),
  getTextProviderResolution: vi.fn(),
  getUsageRequestId: vi.fn(),
  refundUsage: vi.fn(),
  reserveUsage: vi.fn(),
  saveHistory: vi.fn(),
  saveRemoteAsset: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock("@/lib/ai/chat", () => ({ generateChatReply: mocks.generateChatReply }));
vi.mock("@/lib/ai/copywriting", () => ({ generateCopywriting: mocks.generateCopywriting }));
vi.mock("@/lib/ai/image-provider", () => ({ generateImage: mocks.generateImage }));
vi.mock("@/lib/ai/image-router", () => ({ resolveRoutedImageModel: () => ({ usageType: "image", model: "image-model" }) }));
vi.mock("@/lib/ai/image-edit-provider", () => ({ editImage: mocks.editImage }));
vi.mock("@/lib/ai/image-edit-router", () => ({ resolveImageEditRoute: () => ({ modelId: "edit-model", model: "edit-model", provider: "mock" }) }));
vi.mock("@/lib/ai/text-router", () => ({
  TextProviderError: class TextProviderError extends Error {},
  generateText: mocks.generateText,
  getTextProviderModelId: mocks.getTextProviderModelId,
  getTextProviderResolution: mocks.getTextProviderResolution,
}));
vi.mock("@/lib/ai/image-prompt-builder", () => ({ buildImagePrompt: () => "image prompt" }));
vi.mock("@/lib/ai/product-generation-brief-prompt-builder", () => ({ buildProductGenerationBriefPrompt: () => "brief" }));
vi.mock("@/lib/ai/product-scene-prompt-builder", () => ({ buildProductSceneEditPrompt: () => "scene prompt" }));
vi.mock("@/lib/ai/product-visual-fidelity-prompt-builder", () => ({ buildProductVisualFidelityPrompt: () => "fidelity" }));
vi.mock("@/lib/ai/product-image-set-image-prompt-builder", () => ({ buildProductImageSetImagePrompt: () => "image set prompt" }));
vi.mock("@/lib/ai/product-detail-page-image-prompt-builder", () => ({ buildProductDetailPageImagePrompt: () => "detail prompt" }));
vi.mock("@/lib/ai/product-image-set-plan-prompt-builder", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/product-image-set-plan-prompt-builder")>();
  return { ...original, buildProductImageSetPlanPrompt: () => "image set plan" };
});
vi.mock("@/lib/ai/product-detail-page-plan-prompt-builder", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/ai/product-detail-page-plan-prompt-builder")>();
  return { ...original, buildProductDetailPagePlanPrompt: () => "detail plan" };
});
vi.mock("@/lib/ai/product-content-risk-scanner", () => ({ scanProductContentRisk: () => ({ level: "none", matches: [] }) }));
vi.mock("@/lib/ai/product-image-set-structure-validation", () => ({ validateImageSetStructure: () => ({ valid: true }) }));
vi.mock("@/lib/asset-ingest", () => ({ saveRemoteAsset: mocks.saveRemoteAsset }));
vi.mock("@/lib/assets", () => ({ createAsset: mocks.createAsset, getAssetForUser: mocks.getAssetForUser }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/history", () => ({
  getHistoryRecordForUser: mocks.getHistoryRecordForUser,
  getProductRelatedHistory: mocks.getProductRelatedHistory,
  saveHistory: mocks.saveHistory,
}));
vi.mock("@/lib/product-copywriting", () => ({ isProductImageAnalysis: () => true }));
vi.mock("@/lib/product-generation-brief", () => ({ sanitizeProductGenerationBrief: () => null }));
vi.mock("@/lib/product-output-settings", () => ({ sanitizeProductOutputSettings: () => null }));
vi.mock("@/lib/storage", () => ({ getFileUrl: mocks.getFileUrl, uploadFile: mocks.uploadFile }));
vi.mock("@/lib/usage", () => ({
  classifyUsageFailure: mocks.classifyUsageFailure,
  finalizeUsage: mocks.finalizeUsage,
  getUsageRequestId: mocks.getUsageRequestId,
  refundUsage: mocks.refundUsage,
  reserveUsage: mocks.reserveUsage,
}));

import { POST as chatPost } from "@/app/api/chat/route";
import { POST as copywritingPost } from "@/app/api/copywriting/route";
import { POST as imagePost } from "@/app/api/image/generate/route";
import { POST as scenePost } from "@/app/api/products/scene-image/route";
import { POST as imageSetPost } from "@/app/api/products/image-set/generate/route";
import { POST as detailPagePost } from "@/app/api/products/detail-page/generate/route";
import { POST as imageSetPlanPost } from "@/app/api/products/image-set/plan/route";
import { POST as detailPagePlanPost } from "@/app/api/products/detail-page/plan/route";

function post(body: object) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "request-coverage-1" },
    body: JSON.stringify(body),
  });
}

const analysisRecord = {
  id: "analysis-1",
  type: "product-analysis",
  title: "测试商品",
  assetId: "source-1",
  output: { productNameSuggestions: ["测试商品"], category: "测试分类", mustKeepDetails: [], avoidChanges: [] },
};

describe("remaining usage route coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getUsageRequestId.mockReturnValue("request-coverage-1");
    mocks.reserveUsage.mockResolvedValue({ created: true, record: { id: "usage-1" } });
    mocks.finalizeUsage.mockResolvedValue({ status: "succeeded" });
    mocks.refundUsage.mockResolvedValue({ status: "refunded" });
    mocks.getTextProviderModelId.mockReturnValue("text-model");
    mocks.getTextProviderResolution.mockReturnValue({
      modelId: "chat-model",
      model: "chat-model",
      provider: "mock",
      hasApiKey: true,
      baseUrlHost: "mock.local",
    });
    mocks.getHistoryRecordForUser.mockResolvedValue(analysisRecord);
    mocks.getProductRelatedHistory.mockResolvedValue([]);
    mocks.getAssetForUser.mockResolvedValue({ id: "source-1", type: "image", name: "source.png", url: "source/path.png" });
    mocks.getFileUrl.mockResolvedValue("https://example.test/source.png");
    mocks.editImage.mockResolvedValue({ b64Json: VALID_PNG, provider: "mock", model: "edit-model", modelId: "edit-model" });
    mocks.uploadFile.mockResolvedValue({ path: "generated/result.png", signedUrl: "https://example.test/result.png" });
    mocks.createAsset.mockResolvedValue({ id: "asset-1", url: "generated/result.png" });
    mocks.saveHistory.mockResolvedValue({ id: "history-1" });
    mocks.generateChatReply.mockResolvedValue("有效回复");
    mocks.generateCopywriting.mockResolvedValue({ title: "标题", points: [], description: "描述", shortVideoScript: "脚本" });
    mocks.generateImage.mockResolvedValue({ imageUrl: "https://provider.test/result.png", provider: "mock", model: "image-model" });
    mocks.saveRemoteAsset.mockResolvedValue({ asset: { id: "asset-1", url: "generated/result.png" }, signedUrl: "https://example.test/result.png" });
  });

  it("finalizes chat after required history and refunds provider failure", async () => {
    expect((await chatPost(post({ messages: [{ role: "user", content: "你好" }] }))).status).toBe(200);
    expect(mocks.saveHistory).toHaveBeenCalled();
    expect(mocks.finalizeUsage).toHaveBeenCalled();

    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.getTextProviderResolution.mockReturnValue({ modelId: "chat-model", model: "chat-model", provider: "mock" });
    mocks.getUsageRequestId.mockReturnValue("request-coverage-2");
    mocks.reserveUsage.mockResolvedValue({ created: true, record: { id: "usage-2" } });
    mocks.generateChatReply.mockRejectedValue(new Error("provider failed"));
    expect((await chatPost(post({ messages: [{ role: "user", content: "你好" }] }))).status).toBeGreaterThanOrEqual(500);
    expect(mocks.refundUsage).toHaveBeenCalled();
  });

  it("finalizes quick copywriting and refunds generation failure", async () => {
    const body = { productName: "商品", productType: "服饰", sellingPoints: "卖点", platform: "淘宝", tone: "专业", outputType: "listing" };
    expect((await copywritingPost(post(body))).status).toBe(200);
    expect(mocks.finalizeUsage).toHaveBeenCalled();

    mocks.generateCopywriting.mockRejectedValueOnce(new Error("provider failed"));
    expect((await copywritingPost(post(body))).status).toBe(500);
    expect(mocks.refundUsage).toHaveBeenCalled();
  });

  it("refunds independent image generation when durable storage fails", async () => {
    mocks.saveRemoteAsset.mockRejectedValueOnce(new Error("storage failed"));
    expect((await imagePost(post({ product: "商品", platform: "淘宝", purpose: "主图", style: "简约" }))).status).toBe(500);
    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "STORAGE_ERROR" }));
    expect(mocks.finalizeUsage).not.toHaveBeenCalled();
  });

  it("returns a fresh image URL without persisting it in image generation history", async () => {
    const response = await imagePost(post({ product: "商品", platform: "淘宝", purpose: "主图", style: "简约" }));
    const data = await response.json();
    const historyInput = mocks.saveHistory.mock.calls.at(-1)?.[0];

    expect(response.status).toBe(200);
    expect(data.imageUrl).toBe("https://example.test/result.png");
    expect(historyInput.output).not.toHaveProperty("imageUrl");
    expect(historyInput.output).toEqual(expect.objectContaining({ assetId: "asset-1", storagePath: "generated/result.png" }));
  });

  it("refunds scene image Asset and History persistence failures", async () => {
    const body = { analysisHistoryId: "analysis-1", scene: "客厅" };
    mocks.createAsset.mockRejectedValueOnce(new Error("asset failed"));
    expect((await scenePost(post(body))).status).toBe(500);
    expect(mocks.refundUsage).toHaveBeenLastCalledWith(expect.objectContaining({ failureCode: "ASSET_PERSIST_ERROR" }));

    mocks.createAsset.mockResolvedValueOnce({ id: "asset-2", url: "generated/result-2.png" });
    mocks.saveHistory.mockRejectedValueOnce(new Error("history failed"));
    expect((await scenePost(post(body))).status).toBe(500);
    expect(mocks.refundUsage).toHaveBeenLastCalledWith(expect.objectContaining({ failureCode: "HISTORY_PERSIST_ERROR" }));
  });

  it("returns a fresh scene URL without persisting it in history", async () => {
    const response = await scenePost(post({ analysisHistoryId: "analysis-1", scene: "客厅" }));
    const data = await response.json();
    const historyInput = mocks.saveHistory.mock.calls.at(-1)?.[0];

    expect(response.status).toBe(200);
    expect(data.imageUrl).toBe("https://example.test/result.png");
    expect(historyInput.output).not.toHaveProperty("imageUrl");
  });

  it("settles each image-set image independently", async () => {
    const body = { analysisHistoryId: "analysis-1", count: 3, purpose: "detail-page", image: { imageIndex: 1, imageType: "hero" } };
    const successResponse = await imageSetPost(post(body));
    const successData = await successResponse.json();
    expect(successResponse.status).toBe(200);
    expect(successData.imageUrl).toBe("https://example.test/result.png");
    expect(mocks.finalizeUsage).toHaveBeenCalledTimes(1);
    expect(mocks.saveHistory.mock.calls.at(-1)?.[0].output).not.toHaveProperty("imageUrl");

    mocks.editImage.mockRejectedValueOnce(new Error("provider failed"));
    expect((await imageSetPost(post({ ...body, image: { imageIndex: 2, imageType: "selling-point" } }))).status).toBe(500);
    expect(mocks.refundUsage).toHaveBeenCalledTimes(1);
  });

  it("settles each detail-page image independently", async () => {
    const body = { analysisHistoryId: "analysis-1", style: "ecommerce", page: { pageIndex: 1, sectionType: "hero" } };
    const successResponse = await detailPagePost(post(body));
    const successData = await successResponse.json();
    expect(successResponse.status).toBe(200);
    expect(successData.imageUrl).toBe("https://example.test/result.png");
    expect(mocks.finalizeUsage).toHaveBeenCalledTimes(1);
    expect(mocks.saveHistory.mock.calls.at(-1)?.[0].output).not.toHaveProperty("imageUrl");

    mocks.editImage.mockRejectedValueOnce(new Error("provider failed"));
    expect((await detailPagePost(post({ ...body, page: { pageIndex: 2, sectionType: "selling-point" } }))).status).toBe(500);
    expect(mocks.refundUsage).toHaveBeenCalledTimes(1);
  });

  it("charges planning only after a valid plan and refunds parse failure", async () => {
    mocks.generateText.mockResolvedValueOnce(JSON.stringify({
      images: [1, 2, 3].map((imageIndex) => ({ imageIndex, imageType: imageIndex === 1 ? "hero" : imageIndex === 3 ? "cta" : "selling-point" })),
    }));
    expect((await imageSetPlanPost(post({ analysisHistoryId: "analysis-1", count: 3, purpose: "detail-page", structureMode: "smart" }))).status).toBe(200);
    expect(mocks.reserveUsage).toHaveBeenCalledWith(expect.objectContaining({ type: "copywriting" }));
    expect(mocks.finalizeUsage).toHaveBeenCalled();

    mocks.generateText.mockResolvedValueOnce("not-json");
    expect((await detailPagePlanPost(post({ analysisHistoryId: "analysis-1", count: 3, style: "ecommerce" }))).status).toBe(500);
    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "PARSE_ERROR" }));
  });
});
