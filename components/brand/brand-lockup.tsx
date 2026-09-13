import { BRAND } from "@/lib/brand";

type BrandMarkProps = {
  className?: string;
  size?: "small" | "standard";
};

type BrandLockupProps = BrandMarkProps & {
  wordmarkClassName?: string;
};

export function BrandMark({ className = "", size = "standard" }: BrandMarkProps) {
  const paths =
    size === "small"
      ? ["M5 5V19H15", "M5 5H18V10", "M10 9V16H19"]
      : ["M5 4.5V19.5H15", "M5 4.5H18.5V9", "M10 9.25V16H19", "M10 9.25H12.75"];

  return (
    <svg
      aria-hidden="true"
      className={className}
      data-brand-symbol={size === "small" ? "vahoro-shared-structure-small" : "vahoro-shared-structure"}
      fill="none"
      focusable="false"
      height="24"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="2.1"
      viewBox="0 0 24 24"
      width="24"
    >
      {paths.map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  const classes = ["brand-wordmark", className].filter(Boolean).join(" ");

  return <span className={classes}>{BRAND.name}</span>;
}

export function BrandLockup({ className = "", size = "standard", wordmarkClassName = "" }: BrandLockupProps) {
  return (
    <>
      <BrandMark className={className} size={size} />
      <BrandWordmark className={wordmarkClassName} />
    </>
  );
}
