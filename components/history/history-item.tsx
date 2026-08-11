"use client";

import { HistoryChatDetail } from "@/components/history/history-chat-detail";
import { HistoryCopywritingDetail } from "@/components/history/history-copywriting-detail";
import { HistoryJsonFallback } from "@/components/history/history-json-fallback";
import { HistoryMediaPreview } from "@/components/history/history-media-preview";
import { HistoryProductAnalysisDetail } from "@/components/history/history-product-analysis-detail";
import type { HistoryRecord } from "@/lib/types";
import { useState } from "react";

type HistoryItemProps = {
  record: HistoryRecord;
  onDelete: (id: string) => void;
};

const historyTypeLabels: Record<HistoryRecord["type"], string> = {
  copywriting: "文案",
  chat: "聊天",
  image: "图片",
  "image-enhance": "图片优化",
  video: "视频",
  "product-analysis": "商品分析",
};

function isMediaRecord(type: HistoryRecord["type"]) {
  return type === "image" || type === "image-enhance" || type === "video";
}

function isImageAssetRecord(type: HistoryRecord["type"]) {
  return type === "image" || type === "image-enhance";
}

function getStringField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;

  return typeof record[key] === "string" ? record[key] : "";
}

function getMediaBasicItems(record: HistoryRecord) {
  return [
    ["商品", getStringField(record.input, "product") || getStringField(record.input, "productName") || getStringField(record.input, "fileName")],
    ["平台", getStringField(record.input, "platform")],
    ["用途", getStringField(record.input, "purpose")],
    ["风格", getStringField(record.input, "style")],
  ].filter((item): item is [string, string] => Boolean(item[1]));
}

function MediaMeta({ record }: { record: HistoryRecord }) {
  const metaItems = [
    ["商品", getStringField(record.input, "product") || getStringField(record.input, "productName") || getStringField(record.input, "fileName")],
    ["平台", getStringField(record.input, "platform")],
    ["用途", getStringField(record.input, "purpose") || getStringField(record.input, "videoType")],
    ["风格", getStringField(record.input, "style")],
    ["状态", getStringField(record.output, "status")],
    ["模型/服务", getStringField(record.output, "provider")],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  if (!metaItems.length) {
    return null;
  }

  return (
    <div className="history-media-meta">
      {metaItems.map(([label, value]) => (
        <span key={label}>
          {label}：{value}
        </span>
      ))}
    </div>
  );
}

function ImageAssetBasicInfo({ record }: { record: HistoryRecord }) {
  const basicItems = getMediaBasicItems(record);

  if (!basicItems.length) {
    return <p className="history-asset-muted">暂无更多基础信息</p>;
  }

  return (
    <div className="history-asset-basic">
      {basicItems.map(([label, value]) => (
        <span key={label}>
          {label}：{value}
        </span>
      ))}
    </div>
  );
}

function ImageAssetExpandedDetail({ record }: { record: HistoryRecord }) {
  const detailItems = [
    ["Prompt", getStringField(record.output, "prompt") || getStringField(record.input, "prompt")],
    ["模型", getStringField(record.output, "model") || getStringField(record.output, "modelId") || getStringField(record.input, "model")],
    ["服务", getStringField(record.output, "provider")],
    ["任务 ID", getStringField(record.output, "taskId")],
    ["状态", getStringField(record.output, "status")],
    ["Asset ID", record.assetId || getStringField(record.output, "assetId")],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  if (!detailItems.length) {
    return null;
  }

  return (
    <div className="history-asset-expanded">
      {detailItems.map(([label, value]) => (
        <section key={label}>
          <strong>{label}</strong>
          <p>{value}</p>
        </section>
      ))}
    </div>
  );
}

function HistoryRecordDetail({ expanded, record }: { expanded: boolean; record: HistoryRecord }) {
  if (record.type === "copywriting") {
    return <HistoryCopywritingDetail expanded={expanded} output={record.output} />;
  }

  if (record.type === "chat") {
    return <HistoryChatDetail expanded={expanded} input={record.input} output={record.output} />;
  }

  if (record.type === "product-analysis") {
    return <HistoryProductAnalysisDetail expanded={expanded} record={record} />;
  }

  if (isImageAssetRecord(record.type)) {
    return (
      <div className={`history-asset-summary ${expanded ? "expanded" : ""}`}>
        <HistoryMediaPreview record={record} variant="asset" />
        <div className="history-asset-content">
          <ImageAssetBasicInfo record={record} />
          {expanded ? <ImageAssetExpandedDetail record={record} /> : null}
        </div>
      </div>
    );
  }

  if (isMediaRecord(record.type)) {
    return (
      <div className="history-readable-detail">
        <HistoryMediaPreview record={record} variant="thumbnail" />
        {expanded ? <MediaMeta record={record} /> : null}
      </div>
    );
  }

  return <HistoryJsonFallback input={record.input} output={record.output} />;
}

export function HistoryItem({ record, onDelete }: HistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article className="history-card">
      <div className="history-card-main">
        <span className="history-badge">{historyTypeLabels[record.type]}</span>
        <h3>{record.title}</h3>
        <p>{new Date(record.createdAt).toLocaleString("zh-CN")}</p>
      </div>

      <HistoryRecordDetail expanded={isExpanded} record={record} />

      <div className="history-actions">
        <button type="button" onClick={() => setIsExpanded((current) => !current)}>
          {isExpanded ? "收起详情" : "展开详情"}
        </button>
        <button type="button" onClick={() => onDelete(record.id)}>
          删除记录
        </button>
      </div>
    </article>
  );
}
