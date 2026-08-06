"use client";

import type { UsageStats as UsageStatsData } from "@/lib/usage";
import { useEffect, useState } from "react";

const emptyStats: UsageStatsData = {
  today: 0,
  month: 0,
  total: 0,
  byType: {
    chat: 0,
    copywriting: 0,
    image: 0,
    "image-enhance": 0,
    video: 0,
  },
};

const usageTypeLabels = [
  { label: "Chat", value: "chat" },
  { label: "文案", value: "copywriting" },
  { label: "图片", value: "image" },
  { label: "图片优化", value: "image-enhance" },
  { label: "视频", value: "video" },
] as const;

export function UsageStats() {
  const [stats, setStats] = useState<UsageStatsData>(emptyStats);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/usage/stats", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("使用统计读取失败");
        }

        const data = (await response.json()) as UsageStatsData;
        setStats({
          ...data,
          total: data.total ?? data.today,
        });
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "使用统计读取失败");
      }
    }

    void loadStats();
  }, []);

  return (
    <section className="usage-stat-panel glass-card">
      <div className="dashboard-section-header">
        <div>
          <p className="eyebrow">Usage</p>
          <h2>使用统计</h2>
        </div>
        <span>真实数据</span>
      </div>
      <div className="usage-stat-grid">
        <article className="usage-stat-card">
          <span>今日使用次数</span>
          <strong>{stats.today}</strong>
        </article>
        <article className="usage-stat-card">
          <span>本月使用次数</span>
          <strong>{stats.month}</strong>
        </article>
        <article className="usage-stat-card">
          <span>累计使用次数</span>
          <strong>{stats.total}</strong>
        </article>
      </div>
      <div className="usage-type-grid">
        {usageTypeLabels.map((item) => (
          <article className="usage-type-card" key={item.value}>
            <span>{item.label}</span>
            <strong>{stats.byType[item.value]}</strong>
          </article>
        ))}
      </div>
      {error ? <p className="copywriting-error">{error}</p> : null}
    </section>
  );
}
