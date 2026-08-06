import Link from "next/link";

type FeatureCardProps = {
  description: string;
  href: string;
  label: string;
  title: string;
};

export function FeatureCard({ description, href, label, title }: FeatureCardProps) {
  return (
    <Link className="dashboard-feature-card glass-card" href={href}>
      <span>{label}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </Link>
  );
}
