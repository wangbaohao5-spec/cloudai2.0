"use client";

import type { HistoryRecord } from "@/lib/types";
import { useMemo, useState } from "react";

type RecentTaskFilter = "all" | "copywriting" | "image" | "video" | "chat" | "product-analysis";

type RecentTasksProps = {
  records: HistoryRecord[];
};

const taskFilters: Array<{ label: string; value: RecentTaskFilter }> = [
  { label: "全部", value: "all" },
  { label: "文案", value: "copywriting" },
  { label: "图片", value: "image" },
  { label: "视频", value: "video" },
  { label: "聊天", value: "chat" },
  { label: "商品分析", value: "product-analysis" },
];

const taskTypeLabels: Record<HistoryRecord["type"], string> = {
  copywriting: "文案",
  chat: "聊天",
  image: "图片",
  "image-enhance": "图片",
  video: "视频",
  "product-analysis": "商品分析",
};

function getTaskCategory(type: HistoryRecord["type"]): RecentTaskFilter {
  if (type === "image-enhance") {
    return "image";
  }

  return type;
}

function formatRelativeTime(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }

  if (diff < hour) {
    return `${Math.floor(diff / minute)} 分钟前`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`;
  }

  return new Date(createdAt).toLocaleDateString("zh-CN");
}

export function RecentTasks({ records }: RecentTasksProps) {
  const [activeFilter, setActiveFilter] = useState<RecentTaskFilter>("all");
  const filteredRecords = useMemo(() => {
    if (activeFilter === "all") {
      return records;
    }

    return records.filter((record) => getTaskCategory(record.type) === activeFilter);
  }, [activeFilter, records]);

  return (
    <section className="dashboard-section glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Recent History</p>
          <h2>最近生成历史</h2>
        </div>
        <span>真实数据</span>
      </div>

      <div className="history-filter-tabs" aria-label="最近生成历史分类">
        {taskFilters.map((filter) => (
          <button className={activeFilter === filter.value ? "active" : ""} key={filter.value} type="button" onClick={() => setActiveFilter(filter.value)}>
            {filter.label}
          </button>
        ))}
      </div>

      {filteredRecords.length ? (
        <div className="recent-task-list">
          {filteredRecords.map((record) => (
            <article className="recent-task-item" key={record.id}>
              <div>
                <strong>{record.title}</strong>
                <p>{taskTypeLabels[record.type]}</p>
              </div>
              <span>{formatRelativeTime(record.createdAt)}</span>
              <em>已保存</em>
            </article>
          ))}
        </div>
      ) : (
        <div className="history-empty-state">
          <p>{records.length ? "当前分类下暂无记录。" : "暂无生成历史。完成一次 AI 生成或商品分析后，这里会显示最新记录。"}</p>
        </div>
      )}
    </section>
  );
}
