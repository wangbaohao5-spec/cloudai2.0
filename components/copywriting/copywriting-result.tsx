import type { CopywritingResult as CopywritingResultData } from "@/lib/types";

type CopywritingResultProps = {
  result: CopywritingResultData | null;
};

export function CopywritingResult({ result }: CopywritingResultProps) {
  if (!result) {
    return (
      <article className="copywriting-result cai-result-card" aria-live="polite">
        <p className="eyebrow">Result</p>
        <h2>等待上架内容</h2>
        <div className="copywriting-result-empty cai-empty">
          <span className="cai-empty__icon" aria-hidden="true">
            文
          </span>
          <p className="cai-empty__title">填写商品信息后生成</p>
          <p className="cai-empty__description">结果会按标题、卖点、详情描述和短视频脚本整理成可复制内容。</p>
        </div>
      </article>
    );
  }

  return (
    <article className="copywriting-result cai-result-card" aria-live="polite">
      <p className="eyebrow">Result</p>
      <h2>上架内容</h2>
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
