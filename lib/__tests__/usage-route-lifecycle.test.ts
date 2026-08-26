import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  analyzeProductImageAsset: vi.fn(),
  buildCopywritingDataFromAnalysis: vi.fn(),
  buildProductOutputSettingsPrompt: vi.fn(),
  classifyUsageFailure: vi.fn((error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : String(error);
    return /Unexpected token|invalid json/i.test(message) ? "PARSE_ERROR" : fallback;
  }),
  createAsset: vi.fn(),
  editImage: vi.fn(),
  finalizeUsage: vi.fn(),
  generateCopywriting: vi.fn(),
  getAssetForUser: vi.fn(),
  getCurrentUser: vi.fn(),
  getFileUrl: vi.fn(),
  getHistoryRecordForUser: vi.fn(),
  getTextProviderModelId: vi.fn(),
  getUsageRequestId: vi.fn(),
  isProductImageAnalysis: vi.fn(),
  refundUsage: vi.fn(),
  reserveUsage: vi.fn(),
  resolveImageEditRoute: vi.fn(),
  sanitizeProductOutputSettings: vi.fn(),
  saveHistory: vi.fn(),
  scanProductContentRisk: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock("@/lib/ai/product-analysis", () => ({ analyzeProductImageAsset: mocks.analyzeProductImageAsset }));
vi.mock("@/lib/ai/providers/dashscope-vision", () => ({
  DashScopeVisionError: class DashScopeVisionError extends Error {
    status?: number;
    code?: string;
    safeDebug?: string;
  },
}));
vi.mock("@/lib/ai/copywriting", () => ({ generateCopywriting: mocks.generateCopywriting }));
vi.mock("@/lib/ai/product-content-risk-scanner", () => ({ scanProductContentRisk: mocks.scanProductContentRisk }));
vi.mock("@/lib/ai/text-router", () => ({ getTextProviderModelId: mocks.getTextProviderModelId }));
vi.mock("@/lib/ai/image-edit-provider", () => ({ editImage: mocks.editImage }));
vi.mock("@/lib/ai/image-edit-router", () => ({ resolveImageEditRoute: mocks.resolveImageEditRoute }));
vi.mock("@/lib/ai/product-output-settings-prompt-builder", () => ({ buildProductOutputSettingsPrompt: mocks.buildProductOutputSettingsPrompt }));
vi.mock("@/lib/assets", () => ({ createAsset: mocks.createAsset, getAssetForUser: mocks.getAssetForUser }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/history", () => ({ getHistoryRecordForUser: mocks.getHistoryRecordForUser, saveHistory: mocks.saveHistory }));
vi.mock("@/lib/product-copywriting", () => ({
  buildCopywritingDataFromAnalysis: mocks.buildCopywritingDataFromAnalysis,
  isProductImageAnalysis: mocks.isProductImageAnalysis,
}));
vi.mock("@/lib/product-output-settings", () => ({ sanitizeProductOutputSettings: mocks.sanitizeProductOutputSettings }));
vi.mock("@/lib/storage", () => ({ getFileUrl: mocks.getFileUrl, uploadFile: mocks.uploadFile }));
vi.mock("@/lib/usage", () => ({
  classifyUsageFailure: mocks.classifyUsageFailure,
  finalizeUsage: mocks.finalizeUsage,
  getUsageRequestId: mocks.getUsageRequestId,
  refundUsage: mocks.refundUsage,
  reserveUsage: mocks.reserveUsage,
}));

import { POST as postImageEdit } from "@/app/api/image/edit/route";
import { POST as postProductAnalyze } from "@/app/api/products/analyze/route";
import { POST as postProductCopywriting } from "@/app/api/products/copywriting/route";

const user = { id: "user-1", email: "beta@example.com", name: "Beta" };
const validPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";
const sourceAsset = { id: "asset-source", userId: user.id, type: "upload", name: "source.png", url: "source/path", createdAt: new Date() };
const analysisRecord = {
  id: "analysis-1",
  assetId: sourceAsset.id,
  type: "product-analysis",
  title: "Test product",
  input: {},
  output: { category: "bag", productNameSuggestions: ["Test bag"] },
  createdAt: new Date().toISOString(),
};
const reservation = {
  created: true,
  record: {
    id: "usage-1",
    userId: user.id,
    type: "image",
    model: "model",
    status: "pending",
    requestId: "request-123",
    units: 1,
    settledAt: null,
    failureCode: null,
    metadata: null,
    createdAt: new Date(),
  },
};

function jsonRequest(url: string, body: object) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("usage-aware generation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.getUsageRequestId.mockReturnValue("request-123");
    mocks.reserveUsage.mockResolvedValue(reservation);
    mocks.finalizeUsage.mockResolvedValue({ ...reservation.record, status: "succeeded" });
    mocks.refundUsage.mockResolvedValue({ ...reservation.record, status: "refunded" });
    mocks.getHistoryRecordForUser.mockResolvedValue(analysisRecord);
    mocks.getAssetForUser.mockResolvedValue(sourceAsset);
    mocks.isProductImageAnalysis.mockReturnValue(true);
    mocks.sanitizeProductOutputSettings.mockReturnValue(null);
    mocks.getTextProviderModelId.mockReturnValue("text-model");
    mocks.buildCopywritingDataFromAnalysis.mockReturnValue({ productName: "Test bag" });
    mocks.generateCopywriting.mockResolvedValue({ title: "Title", points: [], description: "Description", shortVideoScript: "" });
    mocks.scanProductContentRisk.mockReturnValue({ level: "low", matches: [] });
    mocks.analyzeProductImageAsset.mockResolvedValue({ category: "bag", productNameSuggestions: ["Test bag"] });
    mocks.getFileUrl.mockResolvedValue("https://signed.example/source.png");
    mocks.resolveImageEditRoute.mockReturnValue({ provider: "run-api", model: "image-model", modelId: "run-api-image-model-image-edit" });
    mocks.buildProductOutputSettingsPrompt.mockReturnValue("");
    mocks.editImage.mockResolvedValue({ b64Json: validPngBase64, provider: "run-api", model: "image-model" });
    mocks.uploadFile.mockResolvedValue({ path: "stored/path.png", signedUrl: "https://signed.example/result.png" });
    mocks.createAsset.mockResolvedValue({ ...sourceAsset, id: "asset-result", type: "image", url: "stored/path.png" });
    mocks.saveHistory.mockResolvedValue({ id: "history-1" });
  });

  it("validates product copywriting before reserving usage", async () => {
    const response = await postProductCopywriting(jsonRequest("http://localhost/api/products/copywriting", {}));

    expect(response.status).toBe(400);
    expect(mocks.reserveUsage).not.toHaveBeenCalled();
  });

  it("refunds product copywriting provider failures", async () => {
    mocks.generateCopywriting.mockRejectedValueOnce(new Error("provider unavailable"));

    await postProductCopywriting(jsonRequest("http://localhost/api/products/copywriting", { analysisHistoryId: analysisRecord.id }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "PROVIDER_ERROR" }));
    expect(mocks.finalizeUsage).not.toHaveBeenCalled();
  });

  it("refunds product copywriting parse failures", async () => {
    mocks.generateCopywriting.mockRejectedValueOnce(new SyntaxError("Unexpected token"));

    await postProductCopywriting(jsonRequest("http://localhost/api/products/copywriting", { analysisHistoryId: analysisRecord.id }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "PARSE_ERROR" }));
  });

  it("refunds product copywriting history failures", async () => {
    mocks.saveHistory.mockRejectedValueOnce(new Error("history failed"));

    await postProductCopywriting(jsonRequest("http://localhost/api/products/copywriting", { analysisHistoryId: analysisRecord.id }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "HISTORY_PERSIST_ERROR" }));
  });

  it("finalizes product copywriting only after history succeeds", async () => {
    const response = await postProductCopywriting(jsonRequest("http://localhost/api/products/copywriting", { analysisHistoryId: analysisRecord.id }));

    expect(response.status).toBe(200);
    expect(mocks.saveHistory).toHaveBeenCalled();
    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ historyId: "history-1" }) }));
    expect(mocks.refundUsage).not.toHaveBeenCalled();
  });

  it("leaves usage pending when finalize fails after persistence", async () => {
    mocks.finalizeUsage.mockRejectedValueOnce(new Error("usage finalize failed"));

    const response = await postProductCopywriting(jsonRequest("http://localhost/api/products/copywriting", { analysisHistoryId: analysisRecord.id }));

    expect(response.status).toBe(500);
    expect(mocks.saveHistory).toHaveBeenCalled();
    expect(mocks.refundUsage).not.toHaveBeenCalled();
  });

  it("refunds product analysis provider failures", async () => {
    mocks.analyzeProductImageAsset.mockRejectedValueOnce(new Error("provider failed"));

    await postProductAnalyze(jsonRequest("http://localhost/api/products/analyze", { assetId: sourceAsset.id }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "PROVIDER_ERROR" }));
  });

  it("refunds product analysis parse failures", async () => {
    mocks.analyzeProductImageAsset.mockRejectedValueOnce(new SyntaxError("Unexpected token"));

    await postProductAnalyze(jsonRequest("http://localhost/api/products/analyze", { assetId: sourceAsset.id }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "PARSE_ERROR" }));
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });

  it("refunds product analysis history failures", async () => {
    mocks.saveHistory.mockRejectedValueOnce(new Error("history failed"));

    await postProductAnalyze(jsonRequest("http://localhost/api/products/analyze", { assetId: sourceAsset.id }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "HISTORY_PERSIST_ERROR" }));
  });

  it("finalizes product analysis with its workspace history id", async () => {
    const order: string[] = [];
    mocks.reserveUsage.mockImplementationOnce(async () => {
      order.push("reserve");
      return reservation;
    });
    mocks.analyzeProductImageAsset.mockImplementationOnce(async () => {
      order.push("provider");
      return { category: "bag", productNameSuggestions: ["Test bag"] };
    });
    mocks.saveHistory.mockImplementationOnce(async () => {
      order.push("history");
      return { id: "history-1" };
    });
    mocks.finalizeUsage.mockImplementationOnce(async () => {
      order.push("finalize");
      return { ...reservation.record, status: "succeeded" };
    });
    const response = await postProductAnalyze(jsonRequest("http://localhost/api/products/analyze", { assetId: sourceAsset.id }));

    expect(response.status).toBe(200);
    expect(order).toEqual(["reserve", "provider", "history", "finalize"]);
    expect(mocks.analyzeProductImageAsset).toHaveBeenCalledTimes(1);
    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ historyId: "history-1" }) }));
  });

  it("does not run a provider for an already reserved request", async () => {
    mocks.reserveUsage.mockResolvedValueOnce({ ...reservation, created: false });

    const response = await postProductAnalyze(jsonRequest("http://localhost/api/products/analyze", { assetId: sourceAsset.id }));

    expect(response.status).toBe(409);
    expect(mocks.analyzeProductImageAsset).not.toHaveBeenCalled();
    expect(mocks.finalizeUsage).not.toHaveBeenCalled();
    expect(mocks.refundUsage).not.toHaveBeenCalled();
  });

  it("leaves the reservation pending when refund itself fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.generateCopywriting.mockRejectedValueOnce(new Error("provider failed"));
    mocks.refundUsage.mockRejectedValueOnce(new Error("refund database failed"));

    const response = await postProductCopywriting(jsonRequest("http://localhost/api/products/copywriting", { analysisHistoryId: analysisRecord.id }));

    expect(response.status).toBe(500);
    expect(mocks.refundUsage).toHaveBeenCalledTimes(1);
    expect(mocks.finalizeUsage).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("[usage] product copywriting refund failed", expect.any(Object));
    errorSpy.mockRestore();
  });

  it("refunds image edit storage-read failures", async () => {
    mocks.getFileUrl.mockRejectedValueOnce(new Error("storage failed"));

    await postImageEdit(jsonRequest("http://localhost/api/image/edit", { assetId: sourceAsset.id, prompt: "Improve image" }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "STORAGE_ERROR" }));
  });

  it("refunds image edit provider failures", async () => {
    mocks.editImage.mockRejectedValueOnce(new Error("provider failed"));

    await postImageEdit(jsonRequest("http://localhost/api/image/edit", { assetId: sourceAsset.id, prompt: "Improve image" }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "PROVIDER_ERROR" }));
  });

  it("refunds invalid image provider output", async () => {
    mocks.editImage.mockResolvedValueOnce({ b64Json: "", provider: "run-api", model: "image-model" });

    await postImageEdit(jsonRequest("http://localhost/api/image/edit", { assetId: sourceAsset.id, prompt: "Improve image" }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "INVALID_PROVIDER_OUTPUT" }));
  });

  it("refunds non-image bytes returned by the image provider", async () => {
    mocks.editImage.mockResolvedValueOnce({ b64Json: Buffer.from("not-an-image").toString("base64"), provider: "run-api", model: "image-model" });

    await postImageEdit(jsonRequest("http://localhost/api/image/edit", { assetId: sourceAsset.id, prompt: "Improve image" }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "INVALID_PROVIDER_OUTPUT" }));
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });

  it("refunds image edit storage-upload failures", async () => {
    mocks.uploadFile.mockRejectedValueOnce(new Error("upload failed"));

    await postImageEdit(jsonRequest("http://localhost/api/image/edit", { assetId: sourceAsset.id, prompt: "Improve image" }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "STORAGE_ERROR" }));
  });

  it("refunds image edit asset failures", async () => {
    mocks.createAsset.mockRejectedValueOnce(new Error("asset failed"));

    await postImageEdit(jsonRequest("http://localhost/api/image/edit", { assetId: sourceAsset.id, prompt: "Improve image" }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "ASSET_PERSIST_ERROR" }));
    expect(mocks.uploadFile).toHaveBeenCalled();
    expect(mocks.saveHistory).not.toHaveBeenCalled();
  });

  it("refunds image edit history failures", async () => {
    mocks.saveHistory.mockRejectedValueOnce(new Error("history failed"));

    await postImageEdit(jsonRequest("http://localhost/api/image/edit", { assetId: sourceAsset.id, prompt: "Improve image" }));

    expect(mocks.refundUsage).toHaveBeenCalledWith(expect.objectContaining({ failureCode: "HISTORY_PERSIST_ERROR" }));
    expect(mocks.createAsset).toHaveBeenCalled();
  });

  it("finalizes image edit only after storage, asset, and history succeed", async () => {
    const response = await postImageEdit(jsonRequest("http://localhost/api/image/edit", { assetId: sourceAsset.id, prompt: "Improve image" }));

    expect(response.status).toBe(200);
    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ assetId: "asset-result", historyId: "history-1" }),
    }));
    expect(mocks.refundUsage).not.toHaveBeenCalled();
  });

  it("keeps workspace-bound image edits associated with the current analysis", async () => {
    const response = await postImageEdit(jsonRequest("http://localhost/api/image/edit", {
      assetId: sourceAsset.id,
      analysisHistoryId: analysisRecord.id,
      prompt: "Improve image",
    }));

    expect(response.status).toBe(200);
    expect(mocks.resolveImageEditRoute).toHaveBeenCalledWith(expect.objectContaining({ task: "product-image-edit" }), { log: false });
    expect(mocks.reserveUsage).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ analysisHistoryId: analysisRecord.id }),
    }));
    expect(mocks.finalizeUsage).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ analysisHistoryId: analysisRecord.id, assetId: "asset-result", historyId: "history-1" }),
    }));
  });

  it("keeps succeeded usage when response construction fails after persistence", async () => {
    const originalJson = NextResponse.json.bind(NextResponse);
    let responseCalls = 0;
    const responseSpy = vi.spyOn(NextResponse, "json").mockImplementation(((body: unknown, init?: ResponseInit) => {
      responseCalls += 1;

      if (responseCalls === 1) {
        throw new Error("response failed");
      }

      return originalJson(body, init);
    }) as typeof NextResponse.json);

    const response = await postImageEdit(jsonRequest("http://localhost/api/image/edit", { assetId: sourceAsset.id, prompt: "Improve image" }));

    expect(response.status).toBe(500);
    expect(mocks.finalizeUsage).toHaveBeenCalled();
    expect(mocks.refundUsage).not.toHaveBeenCalled();
    responseSpy.mockRestore();
  });
});
