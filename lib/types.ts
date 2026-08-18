import type { ProductContentRiskScanResult } from "@/lib/ai/product-content-risk-scanner";

export type CopywritingFormData = {
  productName: string;
  productType: string;
  sellingPoints: string;
  platform: string;
  tone: string;
  outputType: string;
  goal?: string;
  outputTypes?: string[];
  generationMode?: "single" | "marketing-plan";
};

export type CopywritingResult = {
  title: string;
  points: string[];
  description: string;
  riskScan?: ProductContentRiskScanResult;
  shortVideoScript: string;
};

export type ImageGenerationFormData = {
  product: string;
  platform: string;
  purpose: string;
  style: string;
};

export type ImageGenerationResult = {
  prompt: string;
  type: string;
  status: "success";
  imageUrl: string;
  taskId?: string;
  assetId?: string;
  storagePath?: string;
};

export type HistoryRecord = {
  id: string;
  assetId?: string | null;
  type: "copywriting" | "chat" | "image" | "image-enhance" | "video" | "product-analysis";
  title: string;
  input: unknown;
  output: unknown;
  originalUrl?: string | null;
  previewUrl?: string | null;
  createdAt: string;
};

export type ChatMessageRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatMessageRole;
  content: string;
};

export type PromptTemplate = {
  id: string;
  name: string;
  description: string;
  platform: string[];
  outputType: string;
  prompt: string;
};
