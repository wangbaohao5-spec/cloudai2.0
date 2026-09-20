import {
  DETAIL_PAGE_MODULE_DEFINITIONS,
  type DetailPageModuleType,
  type DetailPageSectionV2,
  type DetailPageStyle,
} from "@/lib/detail-page-project";

const MODULE_VISUAL_DIRECTIONS: Record<Exclude<DetailPageModuleType, "SPECS" | "USAGE_GUIDE">, string> = {
  HERO: "Create a clean primary product visual with generous negative space reserved for later structured copy layout.",
  BENEFITS: "Create a restrained supporting visual that expresses only the verified benefit evidence supplied below, without turning a claim into visual proof.",
  USAGE_SCENE: "Place the real product in a plausible, restrained use context. The scene supports the product and must not imply unverified performance.",
  PRODUCT_DETAIL: "Show only product details supported by the reference image and verified detail evidence. Do not invent hidden surfaces, interfaces, materials, or structure.",
  BRAND_CONTENT: "Create an editorial, brand-oriented product visual while preserving the exact product identity and existing package design.",
};

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function buildProductDetailPageSectionPrompt({
  pageStyle,
  productTitle,
  section,
}: {
  pageStyle: DetailPageStyle;
  productTitle: string;
  section: DetailPageSectionV2;
}) {
  if (section.moduleType === "SPECS" || section.moduleType === "USAGE_GUIDE") {
    throw new Error("This detail page module does not support visual generation.");
  }

  const verifiedEvidence = section.evidence
    .filter((item) => item.verifiedByUser)
    .map((item) => `${compact(item.field)}: ${compact(item.value)}`)
    .filter(Boolean);
  const copyContext = [section.copy.headline, section.copy.body].map(compact).filter(Boolean).join(" / ");

  return [
    "Create one standalone visual asset for a structured ecommerce detail-page section.",
    "The uploaded product image is the sole canonical product identity reference.",
    "Preserve the exact product shape, proportions, package structure, colors, existing logo, and existing label layout.",
    "Do not redesign the product or invent a new package, accessory, interface, material, hidden surface, certification, or function.",
    "This output is a visual asset only. Copy and layout will be rendered separately in a later assembly phase.",
    "NO added advertising typography. NO campaign headline. NO CTA. NO specification table. NO body-copy rendering.",
    "Do not fabricate or replace label copy. Existing real packaging text may remain as part of the photographed product.",
    "Do not add watermarks, badges, prices, ratings, medical claims, performance claims, or partner endorsements.",
    "",
    `Product context: ${compact(productTitle) || "the referenced product"}.`,
    `Section module: ${section.moduleType} (${DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType].label}).`,
    `Section purpose: ${compact(section.purpose)}.`,
    `Visual direction: ${MODULE_VISUAL_DIRECTIONS[section.moduleType]}`,
    copyContext
      ? `Editorial copy context only, not verified evidence and not text to render: ${copyContext}.`
      : "Editorial copy context: none.",
    verifiedEvidence.length
      ? `Verified user evidence allowed for this visual: ${verifiedEvidence.join("; ")}.`
      : "Verified user evidence: none. Do not infer product benefits or specifications.",
    "",
    "Shared page style:",
    `Preset: ${pageStyle.preset}.`,
    `Mood: ${compact(pageStyle.mood)}.`,
    `Palette: ${compact(pageStyle.palette)}.`,
    `Lighting: ${compact(pageStyle.lighting)}.`,
    `Typography direction for later layout only: ${compact(pageStyle.typography)}. Do not render typography in this image.`,
    `Spacing and composition feel: ${compact(pageStyle.spacing)}.`,
    "Keep this visual consistent with the same shared page style used by every section in the project.",
  ].join("\n");
}
