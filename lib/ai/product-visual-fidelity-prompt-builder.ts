import { getProductCategoryVisualStrategy } from "@/lib/ai/product-category-visual-strategy";
import type { ProductImageAnalysis, ProductVisualGenerationMode } from "@/lib/product-types";

type ProductVisualFidelityPromptInput = {
  analysis: ProductImageAnalysis;
  generationMode: ProductVisualGenerationMode;
};

function joinList(items?: string[]) {
  return items?.map((item) => item.trim()).filter(Boolean).join("、") || "";
}

function compactList(...groups: Array<string[] | string | undefined>) {
  return groups
    .flatMap((group) => {
      if (!group) {
        return [];
      }

      return Array.isArray(group) ? group : [group];
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildProductVisualFidelityPrompt({ analysis, generationMode }: ProductVisualFidelityPromptInput) {
  const productName = analysis.productNameSuggestions[0] || analysis.category || "";
  const categoryStrategy = getProductCategoryVisualStrategy({
    category: analysis.category,
    productName,
  });
  const colors = compactList(analysis.colors, analysis.color);
  const materials = compactList(analysis.materials, analysis.material);
  const specifications = compactList(analysis.specifications, analysis.capacity);
  const variants = compactList(analysis.variants);
  const mustKeepDetails = compactList(analysis.mustKeepDetails);
  const avoidChanges = compactList(analysis.avoidChanges);
  const detailAngles = compactList(analysis.detailPageHints?.detailAngles);
  const usageScenes = compactList(analysis.detailPageHints?.usageScenes);

  const sharedContext = [
    `Matched category strategy: ${categoryStrategy.categoryKey}.`,
    colors.length ? `Known product colors / lighting colors: ${joinList(colors)}.` : "",
    materials.length ? `Known product materials: ${joinList(materials)}.` : "",
    specifications.length ? `Known product specifications / capacity: ${joinList(specifications)}.` : "",
    variants.length ? `Known product variants: ${joinList(variants)}.` : "",
    mustKeepDetails.length ? `User-specified must-keep details: ${joinList(mustKeepDetails)}.` : "",
    avoidChanges.length ? `User-specified avoid changes: ${joinList(avoidChanges)}.` : "",
    analysis.visualFidelityNotes ? `Visual fidelity notes: ${analysis.visualFidelityNotes}.` : "",
    detailAngles.length ? `Detail angles to respect: ${joinList(detailAngles)}.` : "",
    usageScenes.length ? `Relevant usage scenes: ${joinList(usageScenes)}.` : "",
    analysis.detailPageHints?.visualMood ? `Preferred visual mood: ${analysis.detailPageHints.visualMood}.` : "",
  ].filter(Boolean);

  const categoryRules =
    generationMode === "faithful"
      ? [
          "Category-specific fidelity rules:",
          ...categoryStrategy.fidelityRules,
          "Category-specific avoid rules:",
          ...categoryStrategy.avoidRules,
        ]
      : [
          "Category-specific consistency guidance:",
          ...categoryStrategy.fidelityRules.map((rule) => `Respect this rule while allowing richer marketing presentation: ${rule}`),
          "Category-specific avoid guidance:",
          ...categoryStrategy.avoidRules,
        ];

  const modeRules =
    generationMode === "faithful"
      ? [
          "Generation mode: faithful product optimization.",
          "Keep the product exactly consistent with the reference image.",
          "Do not redesign the product.",
          "Do not change the product shape, structure, layout, proportions, printed patterns, logos, colors, materials, key details, or decorative elements.",
          "Preserve user-specified must-keep details.",
          "Do not move printed graphics or cartoon elements away from the product.",
          "Do not turn product surface patterns into floating background decorations.",
          "Only improve lighting, background, composition, and marketing presentation.",
          "Do not add props that cover or alter the product.",
          "The final image must look like the exact same physical item.",
        ]
      : [
          "Generation mode: creative marketing scene.",
          "You may create a richer marketing scene, background, props, and atmosphere.",
          "Still keep the main product recognizable and consistent with the reference image.",
          "Do not change core shape, primary colors, brand marks, or essential design details.",
          "Do not let props cover, replace, or visually merge with the product.",
        ];

  return [...modeRules, ...categoryRules, ...sharedContext].join("\n");
}
