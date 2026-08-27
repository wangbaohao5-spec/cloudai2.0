import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAsset: vi.fn(),
  deleteFile: vi.fn(),
  getCurrentUser: vi.fn(),
  uploadFile: vi.fn(),
  validateAssetFile: vi.fn(),
  validateImageBytes: vi.fn(),
}));

vi.mock("@/lib/assets", () => ({ createAsset: mocks.createAsset }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/storage", () => ({
  deleteFile: mocks.deleteFile,
  uploadFile: mocks.uploadFile,
  USER_UPLOAD_MAX_BYTES: 4 * 1024 * 1024,
  validateAssetFile: mocks.validateAssetFile,
  validateImageBytes: mocks.validateImageBytes,
}));

import { POST } from "@/app/api/assets/upload/route";

function createUploadRequest() {
  const formData = new FormData();
  formData.append("file", new File([new Uint8Array([1, 2, 3])], "product.png", { type: "image/png" }));
  formData.append("type", "upload");
  return new Request("http://localhost/api/assets/upload", { method: "POST", body: formData });
}

describe("asset upload compensation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.uploadFile.mockResolvedValue({ path: "user-1/upload/file.png", signedUrl: "https://signed.invalid/file" });
    mocks.createAsset.mockResolvedValue({ id: "asset-1", type: "upload", name: "product.png" });
    mocks.deleteFile.mockResolvedValue(undefined);
    mocks.validateAssetFile.mockImplementation(() => undefined);
    mocks.validateImageBytes.mockResolvedValue(undefined);
  });

  it("rejects invalid image bytes before uploading", async () => {
    mocks.validateImageBytes.mockRejectedValue(new Error("File content is not a valid image."));
    const response = await POST(createUploadRequest());
    expect(response.status).toBe(400);
    expect(mocks.uploadFile).not.toHaveBeenCalled();
    expect(mocks.createAsset).not.toHaveBeenCalled();
  });

  it("does not create an Asset when Storage upload fails", async () => {
    mocks.uploadFile.mockRejectedValue(new Error("storage failed"));
    const response = await POST(createUploadRequest());
    expect(response.status).toBe(500);
    expect(mocks.createAsset).not.toHaveBeenCalled();
  });

  it("removes the uploaded object when Asset creation fails", async () => {
    mocks.createAsset.mockRejectedValue(new Error("database failed"));
    const response = await POST(createUploadRequest());
    expect(response.status).toBe(500);
    expect(mocks.deleteFile).toHaveBeenCalledWith("user-1/upload/file.png");
  });

  it("keeps the original failure when Storage cleanup also fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.createAsset.mockRejectedValue(new Error("database failed"));
    mocks.deleteFile.mockRejectedValue(new Error("cleanup failed"));
    const response = await POST(createUploadRequest());
    expect(response.status).toBe(500);
    expect(warning).toHaveBeenCalledWith("[asset-upload] storage cleanup failed", expect.objectContaining({ userId: "user-1" }));
    warning.mockRestore();
  });

  it("creates an Asset after a valid Storage upload", async () => {
    const response = await POST(createUploadRequest());
    expect(response.status).toBe(200);
    expect(mocks.createAsset).toHaveBeenCalledWith(expect.objectContaining({ url: "user-1/upload/file.png" }));
    expect(mocks.deleteFile).not.toHaveBeenCalled();
  });
});
