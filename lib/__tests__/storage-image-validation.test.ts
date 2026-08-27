import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { validateImageBytes } from "@/lib/storage";

describe("uploaded image byte validation", () => {
  it("accepts a decodable image matching its MIME type", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: "#ffffff" } }).png().toBuffer();
    await expect(validateImageBytes(png, "image/png")).resolves.toBeUndefined();
  });

  it("rejects fake image content", async () => {
    await expect(validateImageBytes(Buffer.from("not an image"), "image/png")).rejects.toThrow("not a valid");
  });

  it("rejects content that does not match the declared MIME type", async () => {
    const jpeg = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffffff" } }).jpeg().toBuffer();
    await expect(validateImageBytes(jpeg, "image/png")).rejects.toThrow("does not match");
  });
});
