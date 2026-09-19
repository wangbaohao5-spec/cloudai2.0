import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createBucket: vi.fn(),
  createClient: vi.fn(),
  createSignedUrl: vi.fn(),
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

import { uploadFile } from "@/lib/storage";

describe("storage upload infrastructure contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.test/signed" },
      error: null,
    });
    mocks.from.mockReturnValue({
      createSignedUrl: mocks.createSignedUrl,
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
});
