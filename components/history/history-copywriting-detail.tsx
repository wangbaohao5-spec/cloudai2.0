import type { CopywritingResult } from "@/lib/types";

type HistoryCopywritingDetailProps = {
  expanded: boolean;
  output: unknown;
};

export function isCopywritingResult(output: unknown): output is CopywritingResult {
  if (!output || typeof output !== "object") {
    return false;
  }

  const value = output as Partial<CopywritingResult>;

  return typeof value.title === "string" || Array.isArray(value.points) || typeof value.description === "string" || typeof value.shortVideoScript === "string";
}

export function buildCopywritingText(result: CopywritingResult) {
  return [
    `标题：\n${result.title || ""}`,
    `卖点：\n${(result.points || []).map((point) => `- ${point}`).join("\n")}`,
    `详情：\n${result.description || ""}`,
    `短视频脚本：\n${result.shortVideoScript || ""}`,
  ]
    .filter((section) => section.trim())
    .join("\n\n");
}

export function HistoryCopywritingDetail({ expanded, output }: HistoryCopywritingDetailProps) {
  if (!isCopywritingResult(output)) {
    return null;
  }

  const result = output;

  async function handleCopy() {
    await navigator.clipboard.writeText(buildCopywritingText(result));
  }

  return (
    <div className="history-readable-detail">
      {result.title ? (
        <section>
          <strong>标题</strong>
          <p>{result.title}</p>
        </section>
      ) : null}
      {result.points?.length ? (
        <section>
          <strong>卖点</strong>
          <ul>
            {result.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {expanded && result.description ? (
        <section>
          <strong>详情</strong>
          <p>{result.description}</p>
        </section>
      ) : null}
      {expanded && result.shortVideoScript ? (
        <section>
          <strong>短视频脚本</strong>
          <p>{result.shortVideoScript}</p>
        </section>
      ) : null}
      <div className="history-detail-actions">
        <button type="button" onClick={handleCopy}>
          复制文案
        </button>
      </div>
    </div>
  );
}
