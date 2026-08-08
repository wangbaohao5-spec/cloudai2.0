"use client";

import type { CopywritingResult, HistoryRecord } from "@/lib/types";
import type { ProductImageAnalysis } from "@/lib/product-types";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type HistoryItemProps = {
  record: HistoryRecord;
  onDelete: (id: string) => void;
};

type AssetUrlResponse = {
  url: string;
};

const historyTypeLabels: Record<HistoryRecord["type"], string> = {
  copywriting: "文案",
  chat: "聊天",
  image: "图片",
  "image-enhance": "图片优化",
  video: "视频",
  "product-analysis": "商品分析",
};

function canPreviewAsset(record: HistoryRecord) {
  return Boolean(record.assetId && (record.type === "image" || record.type === "video" || record.type === "product-analysis"));
}

function isCopywritingResult(output: unknown): output is CopywritingResult {
  if (!output || typeof output !== "object") {
    return false;
  }

  const value = output as Partial<CopywritingResult>;

  return typeof value.title === "string" || Array.isArray(value.points) || typeof value.description === "string" || typeof value.shortVideoScript === "string";
}

function isProductImageAnalysis(output: unknown): output is ProductImageAnalysis {
  if (!output || typeof output !== "object") {
    return false;
  }

  const value = output as Partial<ProductImageAnalysis>;

  return typeof value.category === "string" || Array.isArray(value.sellingPoints) || Array.isArray(value.productNameSuggestions);
}

function buildCopywritingText(result: CopywritingResult) {
  return [
    `标题：\n${result.title || ""}`,
    `卖点：\n${(result.points || []).map((point) => `- ${point}`).join("\n")}`,
    `详情：\n${result.description || ""}`,
    `短视频脚本：\n${result.shortVideoScript || ""}`,
  ]
    .filter((section) => section.trim())
    .join("\n\n");
}

function buildProductAnalysisText(result: ProductImageAnalysis) {
  return [
    `商品类别：\n${result.category || ""}`,
    `商品名称建议：\n${(result.productNameSuggestions || []).map((item) => `- ${item}`).join("\n")}`,
    `商品特点：\n${(result.features || []).map((item) => `- ${item}`).join("\n")}`,
    `电商卖点：\n${(result.sellingPoints || []).map((item) => `- ${item}`).join("\n")}`,
    `目标用户：\n${result.targetAudience || ""}`,
    `使用场景：\n${(result.scenes || []).map((item) => `- ${item}`).join("\n")}`,
    `风险提示：\n${(result.risks || []).map((item) => `- ${item}`).join("\n")}`,
  ]
    .filter((section) => section.trim())
    .join("\n\n");
}

export function HistoryItem({ record, onDelete }: HistoryItemProps) {
  const [assetUrl, setAssetUrl] = useState("");
  const [assetError, setAssetError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const copywritingResult = isCopywritingResult(record.output) ? record.output : null;
  const productAnalysis = isProductImageAnalysis(record.output) ? record.output : null;
  const recordText = useMemo(() => {
    if (copywritingResult) {
      return buildCopywritingText(copywritingResult);
    }

    if (productAnalysis) {
      return buildProductAnalysisText(productAnalysis);
    }

    return JSON.stringify(
      {
        input: record.input,
        output: record.output,
      },
      null,
      2,
    );
  }, [copywritingResult, productAnalysis, record.input, record.output]);

  useEffect(() => {
    let isMounted = true;

    async function loadAssetUrl() {
      if (!canPreviewAsset(record)) {
        return;
      }

      try {
        const response = await fetch(`/api/assets/${record.assetId}/url`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("媒体预览加载失败");
        }

        const data = (await response.json()) as AssetUrlResponse;

        if (isMounted) {
          setAssetUrl(data.url);
          setAssetError("");
        }
      } catch (caughtError) {
        if (isMounted) {
          setAssetError(caughtError instanceof Error ? caughtError.message : "媒体预览加载失败");
        }
      }
    }

    void loadAssetUrl();

    return () => {
      isMounted = false;
    };
  }, [record]);

  async function handleCopy() {
    await navigator.clipboard.writeText(recordText);
  }

  return (
    <article className="history-card">
      <div className="history-card-main">
        <span className="history-badge">{historyTypeLabels[record.type]}</span>
        <h3>{record.title}</h3>
        <p>{new Date(record.createdAt).toLocaleString("zh-CN")}</p>
      </div>

      {copywritingResult ? (
        <div className="history-copywriting-preview">
          {copywritingResult.title ? (
            <section>
              <strong>标题：</strong>
              <p>{copywritingResult.title}</p>
            </section>
          ) : null}
          {copywritingResult.points?.length ? (
            <section>
              <strong>卖点：</strong>
              <ul>
                {copywritingResult.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {copywritingResult.description ? (
            <section>
              <strong>详情：</strong>
              <p>{copywritingResult.description}</p>
            </section>
          ) : null}
          {copywritingResult.shortVideoScript ? (
            <section>
              <strong>短视频脚本：</strong>
              <p>{copywritingResult.shortVideoScript}</p>
            </section>
          ) : null}
        </div>
      ) : null}

      {productAnalysis ? (
        <div className="history-copywriting-preview">
          <section>
            <strong>商品类别：</strong>
            <p>{productAnalysis.category}</p>
          </section>
          <section>
            <strong>电商卖点：</strong>
            <ul>
              {productAnalysis.sellingPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
          <section>
            <strong>目标用户：</strong>
            <p>{productAnalysis.targetAudience}</p>
          </section>
        </div>
      ) : null}

      {canPreviewAsset(record) ? (
        <div className="history-media-preview">
          {assetUrl && (record.type === "image" || record.type === "product-analysis") ? (
            <button type="button" onClick={() => setIsPreviewOpen(true)} aria-label="放大查看图片">
              <Image alt={record.title} height={640} src={assetUrl} unoptimized width={960} />
            </button>
          ) : null}

          {assetUrl && record.type === "video" ? (
            <video controls src={assetUrl}>
              <track kind="captions" />
            </video>
          ) : null}

          {!assetUrl && !assetError ? <p>正在加载媒体预览...</p> : null}
          {assetError ? <p>{assetError}</p> : null}
        </div>
      ) : null}

      {copywritingResult || productAnalysis ? null : (
        <details className="history-detail-block">
          <summary>查看详情</summary>
          <pre>{recordText}</pre>
        </details>
      )}

      <div className="history-actions">
        <button type="button" onClick={handleCopy}>
          {copywritingResult ? "复制文案" : productAnalysis ? "复制分析" : "复制内容"}
        </button>
        <button type="button" onClick={() => onDelete(record.id)}>
          删除记录
        </button>
      </div>

      {isPreviewOpen && assetUrl ? (
        <div className="history-media-lightbox" role="dialog" aria-modal="true" aria-label="图片预览">
          <button type="button" onClick={() => setIsPreviewOpen(false)} aria-label="关闭图片预览" />
          <Image alt={record.title} height={900} src={assetUrl} unoptimized width={1400} />
        </div>
      ) : null}
    </article>
  );
}
