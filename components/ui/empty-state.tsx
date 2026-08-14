import Link from "next/link";

type EmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon: string;
  title: string;
};

export function EmptyState({ actionHref, actionLabel, description, icon, title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link className="button secondary" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
