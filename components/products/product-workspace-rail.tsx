"use client";

import { ProductCreationProgress } from "@/components/products/product-creation-progress";
import { ProductCreationSummary } from "@/components/products/product-creation-summary";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import type { ProductAnalysisResponse } from "@/lib/product-types";
import { useState } from "react";

type UploadedAsset = {
  assetId: string;
  name: string;
  url: string;
};

type ProductWorkspaceRailProps = {
  creationCenterData: ProductCreationCenterData | null;
  error: string;
  isAnalyzing: boolean;
  isRestoring: boolean;
  isUploading: boolean;
  onAnalyze: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  result: ProductAnalysisResponse | null;
  uploadedAsset: UploadedAsset | null;
};

const platformOptions = ["Generic", "Amazon", "Shopee", "TikTok Shop"];

function getWorkspaceStatus({
  creationCenterData,
  result,
  uploadedAsset,
}: {
  creationCenterData: ProductCreationCenterData | null;
  result: ProductAnalysisResponse | null;
  uploadedAsset: UploadedAsset | null;
}) {
  if (!uploadedAsset) {
    return "Not uploaded";
  }

  if (!result) {
    return "Uploaded, ready to analyze";
  }

  const generatedCount = creationCenterData
    ? creationCenterData.copywriting.length + creationCenterData.imageEdits.length + creationCenterData.sceneImages.length
    : 0;

  return generatedCount > 0 ? "Materials generated" : "Analyzed";
}

export function ProductWorkspaceRail({
  creationCenterData,
  error,
  isAnalyzing,
  isRestoring,
  isUploading,
  onAnalyze,
  onFileChange,
  result,
  uploadedAsset,
}: ProductWorkspaceRailProps) {
  const [platform, setPlatform] = useState(platformOptions[0]);
  const status = getWorkspaceStatus({ creationCenterData, result, uploadedAsset });
  const analyzeLabel = result ? "Re-analyze product" : "Analyze product";

  return (
    <aside className="product-workspace-rail">
      <div className="product-workspace-rail-section">
        <p className="eyebrow">Product Workspace</p>
        <h2>Product source</h2>
        <p className="image-generation-intro">Upload one product image, then use the workspace tabs to create listing materials.</p>
      </div>

      <div className="product-upload-box">
        <label>
          Product image
          <input accept="image/png,image/jpeg,image/webp" type="file" onChange={onFileChange} />
        </label>
        <div className="product-upload-preview">
          {uploadedAsset?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={uploadedAsset.name || "Product image preview"} src={uploadedAsset.url} />
          ) : (
            <p>Select an image to upload it as a CloudAI asset.</p>
          )}
        </div>
        {uploadedAsset ? <span>{uploadedAsset.name}</span> : null}
      </div>

      <div className="product-workspace-status">
        <span>Status</span>
        <strong>{status}</strong>
      </div>

      {creationCenterData ? (
        <>
          <ProductCreationSummary
            analysis={creationCenterData.analysis}
            originalAsset={creationCenterData.originalAsset}
            product={creationCenterData.product}
          />
          <ProductCreationProgress
            copywritingCount={creationCenterData.copywriting.length}
            imageEditCount={creationCenterData.imageEdits.length}
            sceneImageCount={creationCenterData.sceneImages.length}
          />
        </>
      ) : null}

      <div className="product-platform-selector" aria-label="Platform placeholder">
        <div className="product-creation-section-header">
          <strong>Platform</strong>
          <span>UI placeholder</span>
        </div>
        <div>
          {platformOptions.map((option) => (
            <button
              className={platform === option ? "active" : undefined}
              key={option}
              onClick={() => setPlatform(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <button className="button primary" disabled={!uploadedAsset || isUploading || isAnalyzing || isRestoring} type="button" onClick={onAnalyze}>
        {isUploading ? "Uploading..." : isAnalyzing ? "Analyzing..." : isRestoring ? "Restoring..." : analyzeLabel}
      </button>

      <p className="image-generation-helper">Analysis uses the existing product-analysis flow and keeps History and Usage behavior unchanged.</p>
      {error ? <p className="image-generation-error">{error}</p> : null}
    </aside>
  );
}
