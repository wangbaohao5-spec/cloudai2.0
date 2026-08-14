type LoadingSize = "lg" | "md" | "sm";

type LongGenerationLoadingProps = {
  className?: string;
  description?: string;
  label?: string;
  size?: LoadingSize;
};

export function LongGenerationLoading({ className = "", description, label, size = "md" }: LongGenerationLoadingProps) {
  const classNames = ["cloudai-loading", "cloudai-loading-long", `cloudai-loading-${size}`, className].filter(Boolean).join(" ");

  return (
    <span className={classNames} role={label ? "status" : undefined} aria-live={label ? "polite" : undefined}>
      <span className="cloudai-loading-long-track" aria-hidden="true">
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
