import { generateAIResponse } from "@/lib/ai/deepseek";
import { buildCopywritingPrompt, COPYWRITING_SYSTEM_PROMPT } from "@/lib/prompts";
import type { CopywritingFormData, CopywritingResult } from "@/lib/types";

export async function generateCopywriting(data: CopywritingFormData): Promise<CopywritingResult> {
  const response = await generateAIResponse(
    [
      { role: "system", content: COPYWRITING_SYSTEM_PROMPT },
      { role: "user", content: buildCopywritingPrompt(data) },
    ],
    { jsonMode: true, temperature: 0.7 },
  );

  const parsedResult = JSON.parse(response) as CopywritingResult;

  return {
    title: parsedResult.title || "",
    points: Array.isArray(parsedResult.points) ? parsedResult.points : [],
    description: parsedResult.description || "",
    shortVideoScript: parsedResult.shortVideoScript || "",
  };
}
