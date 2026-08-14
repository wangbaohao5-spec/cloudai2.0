type WorkspaceToastProps = {
  message: string;
  tone?: "error" | "success";
};

export function WorkspaceToast({ message, tone = "success" }: WorkspaceToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={`workspace-toast ${tone}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
