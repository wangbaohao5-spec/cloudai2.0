import type { ImageGenerationResult } from "@/lib/types";
import Image from "next/image";

type ImageResultProps = {
  result: ImageGenerationResult | null;
};

const mockHistory = [
  { product: "无线耳机", platform: "淘宝", time: "刚刚", image: "科技产品主图" },
  { product: "香薰机", platform: "抖音电商", time: "今天", image: "生活场景封面" },
  { product: "运动水杯", platform: "TikTok Shop", time: "昨天", image: "社交媒体素材" },
];

export function ImageResult({ result }: ImageResultProps) {
  return (
    <section className="image-generation-result">
      <p className="eyebrow">Visual Result</p>
      <h2>电商视觉结果</h2>
      <div className="image-generation-preview">
        {result ? (
          <Image alt={`${result.type} 生成结果`} height={1024} src={result.imageUrl} unoptimized width={1024} />
        ) : (
          <div className="image-generation-result-empty">提交配置后，这里会显示通义万相生成的电商图片。</div>
        )}
      </div>
      <div className="image-generation-result-group">
        <strong>生成状态</strong>
        <p>{result?.status || "等待生成"}</p>
      </div>
      {result?.taskId ? (
        <div className="image-generation-result-group">
          <strong>任务 ID</strong>
          <p>{result.taskId}</p>
        </div>
      ) : null}
      {result ? (
        <div className="image-generation-result-group">
          <strong>自动生成 Prompt</strong>
          <p>{result.prompt}</p>
        </div>
      ) : null}
      <div className="image-generation-history">
        <strong>生成历史</strong>
        <div className="image-history-list">
          {mockHistory.map((item) => (
            <article className="image-history-item" key={`${item.product}-${item.platform}`}>
              <span>{item.image}</span>
              <strong>{item.product}</strong>
              <p>
                {item.platform} · {item.time}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
