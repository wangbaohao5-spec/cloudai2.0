"use client";

import { HistoryItem } from "@/components/history/history-item";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import type { HistoryRecord } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type HistoryFilter = "all" | HistoryRecord["type"];

const historyFilters: Array<{ label: string; value: HistoryFilter }> = [
  { label: "全部", value: "all" },
  { label: "上架文案", value: "copywriting" },
  { label: "创作助手", value: "chat" },
  { label: "商品图", value: "image" },
  { label: "商品图精修", value: "image-enhance" },
  { label: "视频工坊", value: "video" },
  { label: "商品分析", value: "product-analysis" },
];

type HistoryResponse = {
  records: HistoryRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function HistoryList() {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [records, setRecords] = useState<HistoryRecord[]>([]);

  async function loadRecords(cursor?: string | null) {
    const isLoadingNextPage = Boolean(cursor);

    setError("");

    if (isLoadingNextPage) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const url = cursor ? `/api/history?cursor=${encodeURIComponent(cursor)}` : "/api/history";
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("历史记录读取失败，请稍后再试。");
      }

      const data = (await response.json()) as HistoryResponse;
      setRecords((currentRecords) => {
        if (!isLoadingNextPage) {
          return data.records;
        }

        const seenIds = new Set(currentRecords.map((record) => record.id));
        const nextRecords = data.records.filter((record) => !seenIds.has(record.id));

        return [...currentRecords, ...nextRecords];
      });
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "历史记录读取失败，请稍后再试。");
    } finally {
      if (isLoadingNextPage) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
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
    setNextCursor(null);
    setHasMore(false);
  }

  return (
    <section className="history-center glass-card">
      <div className="history-center-hero">
        <div>
          <p className="eyebrow">History Center</p>
          <h2>历史中心</h2>
          <p>统一查看上架文案、创作助手、商品图、商品图精修、视频工坊和商品分析记录。媒体文件会通过云端资产生成临时访问链接。</p>
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

      {error ? (
        <EmptyState icon="!" title="历史记录暂时不可用" description={error} actionHref="/dashboard/products" actionLabel="查看商品项目" />
      ) : null}

      {isLoading ? (
        <div className="history-inline-skeleton" aria-label="正在加载历史记录">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="workspace-skeleton-panel" key={index}>
              <span className="skeleton-block skeleton-title" />
              <span className="skeleton-block skeleton-line" />
              <span className="skeleton-block skeleton-line medium" />
            </article>
          ))}
        </div>
      ) : filteredRecords.length ? (
        <>
          <div className="history-list">
            {filteredRecords.map((record) => (
              <HistoryItem key={record.id} record={record} onDelete={handleDelete} />
            ))}
          </div>
          {hasMore ? (
            <button className="button secondary" disabled={isLoadingMore || !nextCursor} type="button" onClick={() => void loadRecords(nextCursor)}>
              {isLoadingMore ? (
                <>
                  <LoadingIndicator />
                  正在加载...
                </>
              ) : (
                "加载更多"
              )}
            </button>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={records.length ? "🔎" : "🗂"}
          title={records.length ? "当前筛选下没有记录" : "还没有历史记录"}
          description={records.length ? "换一个类型筛选，或者继续制作新的商品素材。" : "完成一次商品分析、上架文案或商品图任务后，记录会自动保存到这里。"}
          actionHref="/dashboard/products/new"
          actionLabel="新建商品项目"
        />
      )}
    </section>
  );
}
