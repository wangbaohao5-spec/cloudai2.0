export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateAIResponseOptions = {
  jsonMode?: boolean;
  temperature?: number;
};

export type AIProvider = {
  generateAIResponse: (messages: AIMessage[], options?: GenerateAIResponseOptions) => Promise<string>;
};

export async function generateAIResponse(messages: AIMessage[], options?: GenerateAIResponseOptions) {
  const { deepseekProvider } = await import("@/lib/ai/deepseek");

  return deepseekProvider.generateAIResponse(messages, options);
}
