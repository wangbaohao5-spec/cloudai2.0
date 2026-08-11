"use client";

import { ProductAssetGallery } from "@/components/products/product-asset-gallery";
import { ProductCreationSummary } from "@/components/products/product-creation-summary";
import type { ProductCreationCenterData } from "@/lib/product-creation-center";
import { useEffect, useState } from "react";

type ProductCreationCenterProps = {
  analysisHistoryId?: string;
  refreshKey?: number;
};

export function ProductCreationCenter({ analysisHistoryId, refreshKey = 0 }: ProductCreationCenterProps) {
  const [data, setData] = useState<ProductCreationCenterData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCreationCenter() {
      if (!analysisHistoryId) {
        setData(null);
        setError("");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/products/creation-center?id=${encodeURIComponent(analysisHistoryId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorData?.error || "商品创作中心加载失败，请稍后再试。");
        }

        const nextData = (await response.json()) as ProductCreationCenterData;

        if (isMounted) {
          setData(nextData);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : "商品创作中心加载失败，请稍后再试。");
          setData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCreationCenter();

    return () => {
      isMounted = false;
    };
  }, [analysisHistoryId, refreshKey]);

  if (!analysisHistoryId) {
    return (
      <section className="product-creation-center glass-card">
        <p className="eyebrow">Creation Center</p>
        <h2>商品创作中心</h2>
        <p className="image-generation-intro">完成商品图片分析后，这里会汇总这个商品的文案、原图优化和营销场景图。</p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="product-creation-center glass-card">
        <p className="eyebrow">Creation Center</p>
        <h2>商品创作中心</h2>
        <p className="image-generation-intro">正在整理这个商品的创作记录...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="product-creation-center glass-card">
        <p className="eyebrow">Creation Center</p>
        <h2>商品创作中心</h2>
        <p className="image-generation-error">{error}</p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="product-creation-center glass-card">
      <ProductCreationSummary
        analysis={data.analysis}
        counts={{
          copywriting: data.copywriting.length,
          imageEdits: data.imageEdits.length,
          sceneImages: data.sceneImages.length,
        }}
        originalAsset={data.originalAsset}
        product={data.product}
      />
      <ProductAssetGallery originalAsset={data.originalAsset} imageEdits={data.imageEdits} sceneImages={data.sceneImages} />
      <div className="product-creation-actions" aria-label="继续创作">
        <a href="#product-copywriting-panel">继续生成文案</a>
        <a href="#product-image-edit-panel">继续优化原图</a>
        <a href="#product-scene-image-panel">继续生成场景图</a>
      </div>
    </section>
  );
}
