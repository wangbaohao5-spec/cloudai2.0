import Image from "next/image";

export type ImageEditViewResult = {
  imageUrl: string;
  assetId: string;
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
        <p>{result ? "success" : "等待编辑"}</p>
      </div>
      {result ? (
        <div className="image-enhance-result-group">
          <strong>生成 Asset ID</strong>
          <p>{result.assetId}</p>
        </div>
      ) : null}
    </section>
  );
}
