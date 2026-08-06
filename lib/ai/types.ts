export type VideoGenerationResult = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  url?: string;
  provider: string;
};
