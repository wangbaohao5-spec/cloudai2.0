import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createBucket: vi.fn(),
  createClient: vi.fn(),
  createSignedUrl: vi.fn(),
  download: vi.fn(),
  from: vi.fn(),
  listBuckets: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/server-env", () => ({
  getRequiredEnv: vi.fn(() => "service-role-key"),
  getSupabaseUrl: vi.fn(() => "https://storage.example.test"),
}));

import { downloadFile, uploadFile } from "@/lib/storage";

describe("storage upload infrastructure contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.test/signed" },
      error: null,
    });
    mocks.download.mockResolvedValue({ data: new Blob(["stored-image"]), error: null });
    mocks.from.mockReturnValue({
      createSignedUrl: mocks.createSignedUrl,
      download: mocks.download,
      upload: mocks.upload,
    });
    mocks.createClient.mockReturnValue({
      storage: {
        createBucket: mocks.createBucket,
        from: mocks.from,
        listBuckets: mocks.listBuckets,
      },
    });
  });

  it("uploads directly to the preconfigured private bucket", async () => {
    const result = await uploadFile({
      content: Buffer.from("image"),
      contentType: "image/png",
      name: "product.png",
      type: "image",
      userId: "user-1",
    });

    expect(mocks.listBuckets).not.toHaveBeenCalled();
    expect(mocks.createBucket).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith("cloudai-assets");
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/image\/\d+-product\.png$/),
      expect.any(Buffer),
      { contentType: "image/png", upsert: false },
    );
    expect(result).toMatchObject({ signedUrl: "https://storage.example.test/signed" });
  });

  it("stops safely when the configured bucket upload fails", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "Bucket not found" } });

    await expect(uploadFile({
      content: Buffer.from("image"),
      contentType: "image/png",
      name: "product.png",
      type: "image",
      userId: "user-1",
    })).rejects.toThrow("Bucket not found");

    expect(mocks.listBuckets).not.toHaveBeenCalled();
    expect(mocks.createBucket).not.toHaveBeenCalled();
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("downloads bytes directly from the private bucket", async () => {
    const result = await downloadFile("user-1/image/source.jpg", 1024);

    expect(mocks.from).toHaveBeenCalledWith("cloudai-assets");
    expect(mocks.download).toHaveBeenCalledWith("user-1/image/source.jpg");
    expect(result.toString()).toBe("stored-image");
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects a downloaded object above the export byte limit", async () => {
    mocks.download.mockResolvedValue({ data: new Blob(["too-large"]), error: null });

    await expect(downloadFile("user-1/image/source.jpg", 4)).rejects.toThrow("exceeds the allowed download size");
  });

  it("fails safely when the Storage object cannot be downloaded", async () => {
    mocks.download.mockResolvedValue({ data: null, error: { message: "missing" } });

    await expect(downloadFile("user-1/image/missing.jpg", 1024)).rejects.toThrow("could not be downloaded");
  });
});
