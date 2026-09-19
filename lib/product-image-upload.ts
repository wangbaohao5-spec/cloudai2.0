import { fetchWithAuthHandling } from "@/lib/authenticated-fetch";

export type UploadedProductAsset = {
  assetId: string;
  name: string;
  url: string;
};

type ResettableFileInput = {
  value: string;
};

export async function uploadProductImage({
  file,
  fileInput,
  onCommit,
  request = fetchWithAuthHandling,
}: {
  file: File;
  fileInput?: ResettableFileInput | null;
  onCommit: (asset: UploadedProductAsset) => void;
  request?: typeof fetchWithAuthHandling;
}) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "upload");

    const response = await request("/api/assets/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errorData?.error || "Product image upload failed. Please try again later.");
    }

    const asset = (await response.json()) as UploadedProductAsset;
    onCommit(asset);
    return asset;
  } finally {
    if (fileInput) {
      fileInput.value = "";
    }
  }
}
