import { BRAND } from "@/lib/brand";

type BrandMarkProps = {
  className?: string;
};

type BrandLockupProps = BrandMarkProps & {
  wordmarkClassName?: string;
};

export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <span aria-hidden="true" className={className} data-brand-symbol="placeholder">
      V
    </span>
  );
}

export function BrandLockup({ className = "", wordmarkClassName = "" }: BrandLockupProps) {
  return (
    <>
      <BrandMark className={className} />
      <span className={wordmarkClassName}>{BRAND.name}</span>
    </>
  );
}
