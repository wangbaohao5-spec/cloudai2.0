import { createClient } from "@supabase/supabase-js";

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

function getSupabaseStorageClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

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

export async function deleteFile(path: string) {
  const supabase = getSupabaseStorageClient();
  const { error } = await supabase.storage.from(ASSET_BUCKET).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}
