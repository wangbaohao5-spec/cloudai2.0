import { generateText, type TextGenerationTask } from "@/lib/ai/text-router";
import { buildCopywritingPrompt, COPYWRITING_SYSTEM_PROMPT } from "@/lib/prompts";
import type { CopywritingFormData, CopywritingResult } from "@/lib/types";

type CopywritingTextTask = Extract<TextGenerationTask, "copywriting" | "product-copywriting">;

export async function generateCopywriting(data: CopywritingFormData, task: CopywritingTextTask = "copywriting"): Promise<CopywritingResult> {
  const response = await generateText({
    messages: [
      { role: "system", content: COPYWRITING_SYSTEM_PROMPT },
      { role: "user", content: buildCopywritingPrompt(data) },
    ],
    jsonMode: true,
    task,
    temperature: 0.7,
  });

  const parsedResult = JSON.parse(response) as CopywritingResult;

  return {
    title: parsedResult.title || "",
    points: Array.isArray(parsedResult.points) ? parsedResult.points : [],
    description: parsedResult.description || "",
    shortVideoScript: parsedResult.shortVideoScript || "",
  };
}
