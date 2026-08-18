type ProductWorkspaceEmptyAction = {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: "primary" | "secondary";
};

type ProductWorkspaceEmptyChecklistItem = {
  done: boolean;
  label: string;
};

type ProductWorkspaceEmptyStateProps = {
  actions?: ProductWorkspaceEmptyAction[];
  checklist?: ProductWorkspaceEmptyChecklistItem[];
  description: string;
  eyebrow?: string;
  marker?: string;
  title: string;
};

export function ProductWorkspaceEmptyState({
  actions = [],
  checklist = [],
  description,
  eyebrow = "下一步",
  marker = "AI",
  title,
}: ProductWorkspaceEmptyStateProps) {
  return (
    <section className="product-workspace-empty-state" aria-label={title}>
      <div className="product-workspace-empty-marker" aria-hidden="true">
        {marker}
      </div>
      <div className="product-workspace-empty-copy">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      {checklist.length ? (
        <div className="product-workspace-empty-checklist" aria-label="当前完成项">
          {checklist.map((item) => (
            <span className={item.done ? "done" : ""} key={item.label}>
              <i aria-hidden="true">{item.done ? "✓" : "–"}</i>
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      {actions.length ? (
        <div className="product-workspace-empty-actions">
          {actions.map((action) => (
            <button
              className={`button ${action.tone === "primary" ? "primary" : "secondary"}`}
              disabled={action.disabled}
              key={action.label}
              type="button"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
