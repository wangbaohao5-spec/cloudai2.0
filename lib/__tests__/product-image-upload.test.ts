import { describe, expect, it, vi } from "vitest";
import { uploadProductImage } from "@/lib/product-image-upload";

function productFile() {
  return new File([new Uint8Array([1, 2, 3])], "product.png", { type: "image/png" });
}

describe("transactional product image upload", () => {
  it("does not commit new product state when upload fails and resets the input", async () => {
    const onCommit = vi.fn();
    const fileInput = { value: "C:\\fakepath\\product.png" };
    const request = vi.fn().mockResolvedValue(Response.json({ error: "upload failed" }, { status: 500 }));

    await expect(uploadProductImage({ file: productFile(), fileInput, onCommit, request })).rejects.toThrow("upload failed");

    expect(onCommit).not.toHaveBeenCalled();
    expect(fileInput.value).toBe("");
  });

  it("commits only after a successful response and permits the same file to be selected again", async () => {
    const asset = { assetId: "asset-1", name: "product.png", url: "https://signed.test/product.png" };
    const onCommit = vi.fn();
    const fileInput = { value: "C:\\fakepath\\product.png" };
    const request = vi.fn().mockResolvedValue(Response.json(asset));

    await uploadProductImage({ file: productFile(), fileInput, onCommit, request });

    expect(onCommit).toHaveBeenCalledWith(asset);
    expect(fileInput.value).toBe("");
  });
});
