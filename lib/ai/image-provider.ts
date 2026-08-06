export type GeneratedImage = {
  imageUrl: string;
  taskId?: string;
};

export type ImageProvider = {
  generateImage: (prompt: string) => Promise<GeneratedImage>;
};

export async function generateImage(prompt: string) {
  const { generateDashScopeImage } = await import("@/lib/ai/providers/dashscope-image");

  return generateDashScopeImage(prompt);
}
