export type ProductImageAnalysis = {
  category: string;
  productNameSuggestions: string[];
  features: string[];
  sellingPoints: string[];
  targetAudience: string;
  scenes: string[];
  visualStyle: string;
  material?: string;
  color?: string;
  risks: string[];
};

export type ProductAnalysisResponse = {
  assetId: string;
  title: string;
  analysis: ProductImageAnalysis;
  warnings?: string[];
};
