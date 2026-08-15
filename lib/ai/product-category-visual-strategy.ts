export type ProductCategoryVisualStrategy = {
  categoryKey: "clothing" | "cup" | "general" | "jewelry" | "keyboard" | "shoes" | "skincare";
  fidelityRules: string[];
  detailPageSuggestions: string[];
  avoidRules: string[];
};

type ProductCategoryVisualStrategyInput = {
  category?: string;
  productName?: string;
};

const CATEGORY_STRATEGIES: Record<ProductCategoryVisualStrategy["categoryKey"], ProductCategoryVisualStrategy> = {
  skincare: {
    categoryKey: "skincare",
    fidelityRules: [
      "Preserve bottle/tube shape, packaging layout, logo, cap, label position, and visible product text.",
      "Do not change the product container design or brand placement.",
    ],
    detailPageSuggestions: ["Use clean water, foam, soft light, cream texture, bathroom counter, sensitive-skin friendly mood."],
    avoidRules: ["Do not invent medical claims, certifications, ingredients, or effects not provided."],
  },
  clothing: {
    categoryKey: "clothing",
    fidelityRules: [
      "Preserve clothing silhouette, fit, collar, sleeve length, hem, logo position, print density, print color, and fabric texture.",
      "Do not change the garment cut, pattern placement, or true product color.",
    ],
    detailPageSuggestions: ["Use model wearing scene, flat lay, fabric close-up, collar/sleeve/hem details, outfit/lifestyle scene."],
    avoidRules: ["Do not add nonexistent buttons, zippers, pockets, patterns, or decorations."],
  },
  jewelry: {
    categoryKey: "jewelry",
    fidelityRules: [
      "Preserve bead count impression, bead colors, special accent beads, pendant shape, chain thickness, material texture, and overall proportions.",
      "Do not add new gemstones, pendants, charms, or metal parts.",
    ],
    detailPageSuggestions: ["Use natural light, texture close-ups, wearing effect, gift scene, daily styling."],
    avoidRules: ["Do not change bead quantity dramatically or move/remove unique accent beads."],
  },
  keyboard: {
    categoryKey: "keyboard",
    fidelityRules: [
      "This is a structure-sensitive product.",
      "Preserve exact keyboard layout, key groups, key count impression, right-side key cluster, arrow key area, bottom row shape, frame slope, cable position, backlight color, keycap characters, printed decorations, and cartoon graphics placement.",
      "Do not simplify, flatten, merge, remove, or rearrange keys.",
    ],
    detailPageSuggestions: ["Use desk setup, backlight atmosphere, keycap close-up, cable/connection detail, gaming/workspace scene."],
    avoidRules: ["Do not redesign the keyboard or turn printed cartoon patterns into floating decorations."],
  },
  shoes: {
    categoryKey: "shoes",
    fidelityRules: [
      "Preserve shoe silhouette, sole shape, upper panels, laces, logo placement, color blocking, material texture, and proportions.",
    ],
    detailPageSuggestions: ["Use side view, sole detail, upper detail, outfit scene, walking/running scene."],
    avoidRules: ["Do not change shoe model, sole structure, or logo placement."],
  },
  cup: {
    categoryKey: "cup",
    fidelityRules: ["Preserve cup shape, lid, handle, mouth rim, body proportions, color, material, printed patterns, and capacity-related appearance."],
    detailPageSuggestions: ["Use office desk, commuting, drinking scene, lid detail, leak-proof detail, multi-color display if variants exist."],
    avoidRules: ["Do not invent extra handles, lids, straws, or change the cup shape."],
  },
  general: {
    categoryKey: "general",
    fidelityRules: ["Preserve the product identity, core shape, primary colors, material impression, logo/marks, and visible defining details."],
    detailPageSuggestions: ["Use clean product hero, key feature close-up, usage scene, material/detail highlight, and conversion-oriented composition."],
    avoidRules: ["Do not invent unverified functions, certifications, prices, sales claims, medical claims, or brand authorization."],
  },
};

const CATEGORY_KEYWORDS: Array<{ key: ProductCategoryVisualStrategy["categoryKey"]; keywords: string[] }> = [
  { key: "keyboard", keywords: ["keyboard", "keycap", "mechanical", "键盘", "机械键盘", "键帽", "轴体"] },
  { key: "clothing", keywords: ["clothing", "apparel", "shirt", "t-shirt", "hoodie", "dress", "vest", "衣服", "服装", "t恤", "T恤", "背心", "裙", "外套", "卫衣"] },
  { key: "jewelry", keywords: ["jewelry", "bracelet", "necklace", "ring", "earring", "bead", "首饰", "手链", "项链", "戒指", "耳环", "珠子", "吊坠"] },
  { key: "skincare", keywords: ["skincare", "cleanser", "cream", "lotion", "serum", "toner", "护肤", "护肤品", "洁面", "洁面乳", "面霜", "乳液", "精华", "爽肤水"] },
  { key: "shoes", keywords: ["shoe", "sneaker", "boots", "sandal", "鞋", "鞋子", "运动鞋", "靴", "凉鞋"] },
  { key: "cup", keywords: ["cup", "mug", "bottle", "tumbler", "thermos", "杯", "杯子", "水杯", "保温杯", "马克杯"] },
];

function normalizeText(value?: string) {
  return (value || "").trim().toLowerCase();
}

export function getProductCategoryVisualStrategy({ category, productName }: ProductCategoryVisualStrategyInput): ProductCategoryVisualStrategy {
  const searchableText = `${normalizeText(category)} ${normalizeText(productName)}`;
  const matchedCategory = CATEGORY_KEYWORDS.find(({ keywords }) => keywords.some((keyword) => searchableText.includes(keyword.toLowerCase())));

  return CATEGORY_STRATEGIES[matchedCategory?.key || "general"];
}
