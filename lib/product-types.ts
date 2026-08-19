export type ProductVisualGenerationMode = "faithful" | "creative";

export type ProductOutputSettings = {
  targetPlatform: string;
  targetMarket: string;
  outputLanguage: string;
  outputRatio: string;
};

export type ProductGenerationBrief = {
  productName: string;
  coreSellingPoints: string[];
  targetAudience: string;
  usageScenarios: string[];
  styleRequirements: string;
  mustKeepDetails: string[];
  avoidChanges: string[];
  extraRequirements: string;
  riskConfirmations?: {
    confirmedBrandClaims?: string;
    forbiddenClaims?: string;
    complianceNotes?: string;
  };
};

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
  specifications?: string[];
  capacity?: string;
  variants?: string[];
  materials?: string[];
  colors?: string[];
  mustKeepDetails?: string[];
  avoidChanges?: string[];
  detailPageHints?: {
    usageScenes?: string[];
    detailAngles?: string[];
    visualMood?: string;
  };
  visualFidelityNotes?: string;
  risks: string[];
};

export type ProductAnalysisResponse = {
  assetId: string;
  historyId?: string;
  title: string;
  analysis: ProductImageAnalysis;
  warnings?: string[];
};
