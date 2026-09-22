import sharp from "sharp";

const MAX_PROVIDER_SOURCE_DIMENSION = 4096;
const JPEG_QUALITY = 90;

function getNormalizedBaseName(fileName?: string) {
  return (fileName || "image")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "image";
}

export async function normalizeRunApiSourceImage(imageBuffer: Buffer, fileName?: string) {
  const metadata = await sharp(imageBuffer, { failOn: "error" }).metadata();
  const isJpeg = metadata.format === "jpeg";
  const pipeline = sharp(imageBuffer, { failOn: "error" })
    .rotate()
    .toColorspace("srgb")
    .resize({
      width: MAX_PROVIDER_SOURCE_DIMENSION,
      height: MAX_PROVIDER_SOURCE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

  const buffer = isJpeg
    ? await pipeline.jpeg({ quality: JPEG_QUALITY, chromaSubsampling: "4:4:4", mozjpeg: true }).toBuffer()
    : await pipeline.png({ compressionLevel: 9 }).toBuffer();
  const outputMetadata = await sharp(buffer, { failOn: "error" }).metadata();
  const extension = isJpeg ? "jpg" : "png";

  return {
    blob: new Blob([new Uint8Array(buffer)], { type: isJpeg ? "image/jpeg" : "image/png" }),
    buffer,
    byteSize: buffer.byteLength,
    contentType: isJpeg ? "image/jpeg" : "image/png",
    fileName: `${getNormalizedBaseName(fileName)}.${extension}`,
    format: isJpeg ? "jpeg" as const : "png" as const,
    height: outputMetadata.height || 0,
    width: outputMetadata.width || 0,
  };
}

export const RUN_API_SOURCE_LIMITS = {
  maxDimension: MAX_PROVIDER_SOURCE_DIMENSION,
  jpegQuality: JPEG_QUALITY,
} as const;
