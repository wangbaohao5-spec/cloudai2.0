import type { ImageEnhanceInput, ImageEnhanceResult } from "@/lib/ai/image-enhance-provider";

type EnhanceResultProps = {
  input: ImageEnhanceInput | null;
  result: ImageEnhanceResult | null;
};

export function EnhanceResult({ input, result }: EnhanceResultProps) {
  return (
    <section className="image-enhance-result">
      <p className="eyebrow">Enhance Result</p>
      <h2>优化结果</h2>
      <div className="image-enhance-output">
        {result?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="优化结果预览" src={result.imageUrl} />
        ) : (
          <p>优化后的商品图将在这里显示</p>
        )}
      </div>
      <div className="image-enhance-result-group">
        <strong>任务状态</strong>
        <p>{result?.status || "等待优化"}</p>
      </div>
      {result ? (
        <>
          <div className="image-enhance-result-group">
            <strong>任务 ID</strong>
            <p>{result.id}</p>
          </div>
          <div className="image-enhance-result-group">
            <strong>优化参数</strong>
            <p>{input ? `${input.platform} · ${input.purpose} · ${input.style}` : "-"}</p>
          </div>
        </>
      ) : null}
    </section>
  );
}
