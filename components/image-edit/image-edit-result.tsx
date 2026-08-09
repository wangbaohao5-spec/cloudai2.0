import Image from "next/image";

export type ImageEditViewResult = {
  imageUrl: string;
  assetId: string;
  goalTitle: string;
  prompt: string;
  model: string;
};

type ImageEditResultProps = {
  result: ImageEditViewResult | null;
};

export function ImageEditResult({ result }: ImageEditResultProps) {
  return (
    <section className="image-edit-result">
      <p className="eyebrow">Edit Result</p>
      <h2>图片编辑结果</h2>
      <div className="image-edit-output">
        {result?.imageUrl ? <Image alt="图片编辑结果预览" height={1024} src={result.imageUrl} unoptimized width={1024} /> : <p>编辑后的图片将在这里显示。</p>}
      </div>
      <div className="image-enhance-result-group">
        <strong>任务状态</strong>
        <p>{result ? "优化完成" : "等待优化"}</p>
      </div>
      {result ? (
        <>
          <div className="image-enhance-result-group">
            <strong>优化目标</strong>
            <p>{result.goalTitle}</p>
          </div>
          <div className="image-enhance-result-group">
            <strong>使用 Prompt</strong>
            <p>{result.prompt}</p>
          </div>
          <div className="image-edit-result-meta">
            <span>模型来源：{result.model}</span>
            <span>Asset ID：{result.assetId}</span>
          </div>
        </>
      ) : null}
    </section>
  );
}
