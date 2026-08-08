"use client";

import { HistoryItem } from "@/components/history/history-item";
import type { HistoryRecord } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type HistoryFilter = "all" | HistoryRecord["type"];

const historyFilters: Array<{ label: string; value: HistoryFilter }> = [
  { label: "全部", value: "all" },
  { label: "文案", value: "copywriting" },
  { label: "聊天", value: "chat" },
  { label: "图片", value: "image" },
  { label: "图片优化", value: "image-enhance" },
  { label: "视频", value: "video" },
  { label: "商品分析", value: "product-analysis" },
];

export function HistoryList() {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<HistoryRecord[]>([]);

  async function loadRecords() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/history", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("历史记录读取失败，请稍后再试。");
      }

      const data = (await response.json()) as { records: HistoryRecord[] };
      setRecords(data.records);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "历史记录读取失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    if (activeFilter === "all") {
      return records;
    }

    return records.filter((record) => record.type === activeFilter);
  }, [activeFilter, records]);

  async function handleDelete(id: string) {
    await fetch(`/api/history/${id}`, {
      method: "DELETE",
    });
    await loadRecords();
  }

  async function handleClear() {
    await fetch("/api/history", {
      method: "DELETE",
    });
    setRecords([]);
  }

  return (
    <section className="history-center glass-card">
      <div className="history-center-hero">
        <div>
          <p className="eyebrow">History Center</p>
          <h2>历史中心</h2>
          <p>统一查看文案、聊天、图片、图片优化、视频和商品分析记录。媒体文件会通过云端资产生成临时访问链接。</p>
        </div>
        <button className="history-clear-button" disabled={!records.length || isLoading} type="button" onClick={() => void handleClear()}>
          清空记录
        </button>
      </div>

      <div className="history-filter-tabs" aria-label="历史类型筛选">
        {historyFilters.map((filter) => (
          <button className={activeFilter === filter.value ? "active" : ""} key={filter.value} type="button" onClick={() => setActiveFilter(filter.value)}>
            {filter.label}
          </button>
        ))}
      </div>

      {error ? <p className="history-empty-state">{error}</p> : null}

      {isLoading ? (
        <div className="history-empty-state">
          <p>正在加载历史记录...</p>
        </div>
      ) : filteredRecords.length ? (
        <div className="history-list">
          {filteredRecords.map((record) => (
            <HistoryItem key={record.id} record={record} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="history-empty-state">
          <p>{records.length ? "当前筛选下暂无记录。" : "暂无历史记录。完成 AI 生成或商品分析后，会自动保存到这里。"}</p>
        </div>
      )}
    </section>
  );
}
