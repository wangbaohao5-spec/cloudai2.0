"use client";

import { LongGenerationLoading } from "@/components/ui/loading";
import type { VideoGenerationResult } from "@/lib/ai/types";
import { BETA_VIDEO_ENABLED } from "@/lib/beta-features";
import { fetchWithAuthHandling } from "@/lib/authenticated-fetch";
import { FormEvent, useState } from "react";

type VideoGenerateResponse = VideoGenerationResult & {
  prompt: string;
};

type VideoFormData = {
  productName: string;
  productDescription: string;
  platform: string;
  videoType: string;
};

const platformOptions = [
  { value: "douyin", label: "抖音电商" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "amazon", label: "Amazon" },
  { value: "shopee", label: "Shopee" },
];

const videoTypeOptions = [
  { value: "productShowcase", label: "产品展示" },
  { value: "shortAd", label: "短视频广告" },
  { value: "unboxing", label: "开箱视频" },
  { value: "lifestyle", label: "生活场景" },
];

const statusLabels: Record<VideoGenerationResult["status"], string> = {
  pending: "等待中",
  processing: "生成中",
  completed: "已完成",
  failed: "生成失败",
};

const mockVideoHistory = [
  { title: "蓝牙耳机短视频广告", platform: "抖音电商", status: "已完成" },
  { title: "便携咖啡杯生活场景", platform: "TikTok Shop", status: "处理中" },
  { title: "护肤套装产品展示", platform: "Shopee", status: "等待生成" },
];

export default function VideoGenerationPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastInput, setLastInput] = useState<VideoFormData | null>(null);
  const [result, setResult] = useState<VideoGenerateResponse | null>(null);

  if (!BETA_VIDEO_ENABLED) {
    return (
      <main className="dashboard-content">
        <section className="video-generation-panel glass-card">
          <p className="eyebrow">Video Studio</p>
          <h2>视频工坊</h2>
          <p className="image-generation-intro">视频能力仍处于实验阶段，暂未向封闭内测开放。</p>
        </section>
      </main>
    );
  }

  async function submitVideoTask(data: VideoFormData) {
    setError("");
    setIsLoading(true);
    setLastInput(data);
    setResult({
      id: "creating-video-task",
      status: "pending",
      provider: "dashscope",
      prompt: "正在根据商品信息生成视频 Prompt...",
    });

    try {
      const response = await fetchWithAuthHandling("/api/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || "视频工坊任务请求失败，请稍后再试。");
      }

      const nextResult = (await response.json()) as VideoGenerateResponse;
      setResult(nextResult);
    } catch (caughtError) {
      setResult(null);
      setError(caughtError instanceof Error ? caughtError.message : "视频工坊任务失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    void submitVideoTask({
      productName: String(formData.get("productName") || ""),
      productDescription: String(formData.get("productDescription") || ""),
      platform: String(formData.get("platform") || platformOptions[0].value),
      videoType: String(formData.get("videoType") || videoTypeOptions[0].value),
    });
  }

  return (
    <main className="dashboard-content">
      <section className="video-generation-shell">
        <div className="video-generation-panel glass-card">
          <p className="eyebrow">Video Studio</p>
          <h2>视频工坊</h2>
          <p className="image-generation-intro">当前为视频能力测试入口，后续将扩展为商品短视频脚本、分镜和成片工作流。</p>
          <form className="video-generation-form" onSubmit={handleSubmit}>
            <label>
              商品名称
              <input name="productName" placeholder="例如：无线蓝牙耳机" required type="text" />
            </label>
            <label>
              商品描述
              <textarea name="productDescription" placeholder="例如：主动降噪、长续航、低延迟，适合通勤和运动使用" required rows={5} />
            </label>
            <label>
              平台
              <select name="platform" defaultValue={platformOptions[0].value}>
                {platformOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              视频类型
              <select name="videoType" defaultValue={videoTypeOptions[0].value}>
                {videoTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary" disabled={isLoading} type="submit">
              {isLoading ? (
                <>
                  <LongGenerationLoading size="sm" />
                  正在生成视频...
                </>
              ) : (
                "生成视频任务"
              )}
            </button>
            {lastInput ? (
              <button className="button secondary" disabled={isLoading} type="button" onClick={() => void submitVideoTask(lastInput)}>
                重新生成
              </button>
            ) : null}
            <p className="video-generation-helper">任务完成后，系统会自动保存到云端历史记录并更新使用统计。</p>
            {error ? <p className="video-generation-error">{error}</p> : null}
          </form>
        </div>

        <section className="video-generation-result">
          <p className="eyebrow">Video Task</p>
          <h2>任务状态</h2>
          <div className="video-generation-preview">
            {result?.url ? (
              <video controls src={result.url}>
                <track kind="captions" />
              </video>
            ) : result ? (
              <div>
                <span>{statusLabels[result.status]}</span>
                <strong>{result.provider}</strong>
              </div>
            ) : (
              <p>视频预览区域</p>
            )}
          </div>
          <div className="video-generation-result-group">
            <strong>生成状态</strong>
            <p>{result ? statusLabels[result.status] : "等待生成"}</p>
          </div>
          {result ? (
            <>
              <div className="video-generation-result-group">
                <strong>任务 ID</strong>
                <p>{result.id}</p>
              </div>
              <div className="video-generation-result-group">
                <strong>服务提供方</strong>
                <p>{result.provider}</p>
              </div>
              {result.url ? (
                <div className="video-generation-result-group">
                  <strong>视频地址</strong>
                  <p>{result.url}</p>
                </div>
              ) : null}
              <div className="video-generation-result-group">
                <strong>自动生成 Prompt</strong>
                <p>{result.prompt}</p>
              </div>
            </>
          ) : null}
          <div className="video-generation-history">
            <strong>历史记录占位</strong>
            {mockVideoHistory.map((item) => (
              <p key={`${item.title}-${item.platform}`}>
                {item.title} / {item.platform} / {item.status}
              </p>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
