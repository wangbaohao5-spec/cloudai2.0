// Text model strategy:
// - copywriting / product-copywriting use the creative copywriting model when configured.
// - detail-page-plan / image-set-plan use the stable planning model when configured.
// - calls without a task use the global default text model.
// Keep concrete model ids in env so pricing, stability, and quality can be adjusted quickly.
export { generateAIResponse, generateText, getTextProviderModelId, getTextProviderName } from "@/lib/ai/provider";
export type { AIMessage, AIProvider, GenerateAIResponseOptions, TextGenerationTask } from "@/lib/ai/provider";
