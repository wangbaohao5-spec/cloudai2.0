type HistoryJsonFallbackProps = {
  input: unknown;
  output: unknown;
};

function buildJsonText(input: unknown, output: unknown) {
  return JSON.stringify(
    {
      input,
      output,
    },
    null,
    2,
  );
}

export function HistoryJsonFallback({ input, output }: HistoryJsonFallbackProps) {
  const text = buildJsonText(input, output);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="history-readable-detail">
      <details className="history-detail-block">
        <summary>查看原始详情</summary>
        <pre>{text}</pre>
      </details>
      <div className="history-detail-actions">
        <button type="button" onClick={handleCopy}>
          复制内容
        </button>
      </div>
    </div>
  );
}
