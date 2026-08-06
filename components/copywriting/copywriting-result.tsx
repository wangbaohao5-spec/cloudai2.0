import type { CopywritingResult as CopywritingResultData } from "@/lib/types";

type CopywritingResultProps = {
  result: CopywritingResultData | null;
};

export function CopywritingResult({ result }: CopywritingResultProps) {
  if (!result) {
    return (
      <article className="copywriting-result" aria-live="polite">
        <p className="eyebrow">Result</p>
        <h2>等待生成内容</h2>
        <div className="copywriting-result-empty">
          <p>填写左侧商品信息后，生成结果会显示在这里。</p>
        </div>
      </article>
    );
  }

  return (
    <article className="copywriting-result" aria-live="polite">
      <p className="eyebrow">Result</p>
      <h2>生成结果</h2>
      <div className="copywriting-result-group">
        <strong>商品标题</strong>
        <h3>{result.title}</h3>
      </div>
      <div className="copywriting-result-group">
        <strong>核心卖点</strong>
        <ul>
          {result.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className="copywriting-result-group">
        <strong>详情描述</strong>
        <p>{result.description}</p>
      </div>
      <div className="copywriting-result-group">
        <strong>短视频口播</strong>
        <p>{result.shortVideoScript}</p>
      </div>
    </article>
  );
}
