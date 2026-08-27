import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, getSupabaseUrl } from "@/lib/server-env";
import sharp from "sharp";

export type AssetFileType = "image" | "video" | "upload";

type UploadFileInput = {
  userId: string;
  type: AssetFileType;
  name: string;
  content: ArrayBuffer | Blob | Buffer | Uint8Array;
  contentType?: string;
};

const ASSET_BUCKET = "cloudai-assets";
const SIGNED_URL_EXPIRES_IN = 60 * 60;
const MB = 1024 * 1024;

export type ImagePreviewTransform = {
  width?: number;
  height?: number;
  resize?: "cover" | "contain" | "fill";
  quality?: number;
};

const DEFAULT_IMAGE_PREVIEW_TRANSFORM: ImagePreviewTransform = {
  width: 480,
  resize: "contain",
  quality: 72,
};

export const ASSET_UPLOAD_LIMITS = {
  image: 10 * MB,
  video: 100 * MB,
  upload: 10 * MB,
} satisfies Record<AssetFileType, number>;

export const USER_UPLOAD_MAX_BYTES = 4 * MB;

const ALLOWED_CONTENT_TYPES = {
  image: ["image/png", "image/jpeg", "image/webp"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  upload: ["image/png", "image/jpeg", "image/webp"],
} satisfies Record<AssetFileType, string[]>;

function getSupabaseStorageClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96) || "asset";
}

function getContentSize(content: UploadFileInput["content"]) {
  if (content instanceof ArrayBuffer) {
    return content.byteLength;
  }

  if (content instanceof Blob) {
    return content.size;
  }

  return content.byteLength;
}

export function validateAssetFile({
  type,
  contentType,
  size,
}: {
  type: AssetFileType;
  contentType?: string | null;
  size: number;
}) {
  const normalizedContentType = contentType?.split(";")[0]?.trim().toLowerCase();
  const allowedTypes = ALLOWED_CONTENT_TYPES[type];

  if (size <= 0) {
    throw new Error("File is empty.");
  }

  if (!normalizedContentType || !allowedTypes.includes(normalizedContentType)) {
    throw new Error(`Unsupported file type. Allowed types: ${allowedTypes.join(", ")}.`);
  }

  if (size > ASSET_UPLOAD_LIMITS[type]) {
    throw new Error(`File is too large. Maximum size is ${Math.floor(ASSET_UPLOAD_LIMITS[type] / MB)}MB.`);
  }
}

export async function validateImageBytes(content: ArrayBuffer | Buffer | Uint8Array, contentType: string) {
  const normalizedContentType = contentType.split(";")[0]?.trim().toLowerCase();
  const expectedFormat = normalizedContentType === "image/jpeg" ? "jpeg" : normalizedContentType?.replace("image/", "");
  const buffer = content instanceof ArrayBuffer
    ? Buffer.from(content)
    : Buffer.from(content.buffer, content.byteOffset, content.byteLength);

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    await image.stats();

    if (!metadata.format || metadata.format !== expectedFormat) {
      throw new Error("Image content does not match its declared file type.");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Image content does not match its declared file type.") {
      throw error;
    }

    throw new Error("File content is not a valid PNG, JPEG, or WebP image.");
  }
}

export async function ensureAssetBucket() {
  const supabase = getSupabaseStorageClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(listError.message);
  }

  const bucketExists = buckets.some((bucket) => bucket.name === ASSET_BUCKET);

  if (bucketExists) {
    return;
  }

  const { error } = await supabase.storage.createBucket(ASSET_BUCKET, {
    public: false,
    fileSizeLimit: 1024 * 1024 * 200,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadFile({ userId, type, name, content, contentType }: UploadFileInput) {
  validateAssetFile({
    type,
    contentType,
    size: getContentSize(content),
  });

  await ensureAssetBucket();

  const supabase = getSupabaseStorageClient();
  const path = `${userId}/${type}/${Date.now()}-${sanitizeFileName(name)}`;
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, content, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const signedUrl = await getFileUrl(path);

  return {
    path,
    signedUrl,
  };
}

export async function getFileUrl(path: string, expiresIn = SIGNED_URL_EXPIRES_IN) {
  const supabase = getSupabaseStorageClient();
  const { data, error } = await supabase.storage.from(ASSET_BUCKET).createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

export async function getImagePreviewUrl(path: string, expiresIn = SIGNED_URL_EXPIRES_IN, transform = DEFAULT_IMAGE_PREVIEW_TRANSFORM) {
  const supabase = getSupabaseStorageClient();
  const { data, error } = await supabase.storage.from(ASSET_BUCKET).createSignedUrl(path, expiresIn, {
    transform,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

export async function getImagePreviewUrlOrOriginal(path: string, originalUrl?: string | null, expiresIn = SIGNED_URL_EXPIRES_IN, transform = DEFAULT_IMAGE_PREVIEW_TRANSFORM) {
  try {
    return await getImagePreviewUrl(path, expiresIn, transform);
  } catch {
    return originalUrl || (await getFileUrl(path, expiresIn));
  }
}

export async function deleteFile(path: string) {
  const supabase = getSupabaseStorageClient();
  const { error } = await supabase.storage.from(ASSET_BUCKET).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}
