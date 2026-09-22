import { normalizeRunApiSourceImage, RUN_API_SOURCE_LIMITS } from "@/lib/ai/providers/run-image-source";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

function photographicPixels(width: number, height: number) {
  const pixels = Buffer.alloc(width * height * 3);
  let seed = 0x5f3759df;
  for (let index = 0; index < pixels.length; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    pixels[index] = seed >>> 24;
  }
  return pixels;
}

describe("RunAPI image source normalization", () => {
  it("keeps a photographic JPEG as JPEG without changing in-limit dimensions", async () => {
    const width = 1200;
    const height = 900;
    const source = await sharp(photographicPixels(width, height), { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 88 })
      .toBuffer();
    const oldPng = await sharp(source).rotate().flatten({ background: "#ffffff" }).toColorspace("srgb").png().toBuffer();
    const normalized = await normalizeRunApiSourceImage(source, "product.jpeg");
    const metadata = await sharp(normalized.buffer).metadata();

    expect(normalized.contentType).toBe("image/jpeg");
    expect(normalized.fileName).toBe("product.jpg");
    expect(metadata.format).toBe("jpeg");
    expect([metadata.width, metadata.height]).toEqual([width, height]);
    expect(normalized.byteSize).toBeLessThan(oldPng.byteLength * 0.5);
    await expect(sharp(normalized.buffer).stats()).resolves.toBeDefined();
  });

  it("applies EXIF orientation without stretching or cropping", async () => {
    const source = await sharp({ create: { width: 320, height: 180, channels: 3, background: "#d8e4de" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const normalized = await normalizeRunApiSourceImage(source, "rotated.jpg");
    const metadata = await sharp(normalized.buffer).metadata();

    expect([metadata.width, metadata.height]).toEqual([180, 320]);
    expect(metadata.orientation ?? 1).toBe(1);
  });

  it("retains PNG transparency", async () => {
    const source = await sharp({ create: { width: 180, height: 240, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0.35 } } }).png().toBuffer();
    const normalized = await normalizeRunApiSourceImage(source, "transparent.png");
    const metadata = await sharp(normalized.buffer).metadata();

    expect(normalized.contentType).toBe("image/png");
    expect(normalized.fileName).toBe("transparent.png");
    expect(metadata.format).toBe("png");
    expect(metadata.hasAlpha).toBe(true);
  });

  it("resizes only over-dimension sources and remains Sharp-decodable", async () => {
    const source = await sharp({ create: { width: RUN_API_SOURCE_LIMITS.maxDimension + 200, height: 600, channels: 3, background: "#d8e4de" } }).jpeg().toBuffer();
    const normalized = await normalizeRunApiSourceImage(source, "wide.jpg");
    const metadata = await sharp(normalized.buffer).metadata();

    expect(metadata.width).toBe(RUN_API_SOURCE_LIMITS.maxDimension);
    expect(metadata.height).toBeLessThan(600);
    await expect(sharp(normalized.buffer).stats()).resolves.toBeDefined();
  });
});
