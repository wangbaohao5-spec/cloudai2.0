type LoadingSize = "lg" | "md" | "sm";

type AiThinkingLoadingProps = {
  className?: string;
  description?: string;
  label?: string;
  size?: LoadingSize;
};

export function AiThinkingLoading({ className = "", description, label, size = "md" }: AiThinkingLoadingProps) {
  const classNames = ["cloudai-loading", "cloudai-loading-ai", `cloudai-loading-${size}`, className].filter(Boolean).join(" ");

  return (
    <span className={classNames} role={label ? "status" : undefined} aria-live={label ? "polite" : undefined}>
      <span className="cloudai-loading-ai-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {label || description ? (
        <span className="cloudai-loading-copy">
          {label ? <span>{label}</span> : null}
          {description ? <small>{description}</small> : null}
        </span>
      ) : null}
    </span>
  );
}
