type LoadingSize = "lg" | "md" | "sm";

type SystemLoadingProps = {
  className?: string;
  description?: string;
  label?: string;
  size?: LoadingSize;
};

export function SystemLoading({ className = "", description, label = "正在加载数据...", size = "md" }: SystemLoadingProps) {
  const classNames = ["cloudai-loading", "cloudai-loading-system", `cloudai-loading-${size}`, className].filter(Boolean).join(" ");

  return (
    <div className={classNames} role="status" aria-live="polite">
      <span className="cloudai-loading-system-mark" aria-hidden="true">
        <span />
      </span>
      <span className="cloudai-loading-copy">
        <span>{label}</span>
        {description ? <small>{description}</small> : null}
      </span>
    </div>
  );
}
