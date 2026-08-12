import "./States.css";

// Error State — per the frontend-design skill: errors don't apologize,
// and they're never vague. State what went wrong and how to fix it.
export interface ErrorStateProps {
  title: string;
  message: string;
  // Status code from the backend (or 0 for network errors). Surfaces
  // when the user needs to know whether they typo'd (4xx) or whether
  // we broke something (5xx).
  status?: number;
  // Optional retry callback — lets the user re-fetch on a transient error.
  onRetry?: () => void;
}

export function ErrorState({ title, message, status, onRetry }: ErrorStateProps) {
  const kind =
    status === undefined || status === 0 ? "Network"
    : status >= 400 && status < 500 ? "Request"
    : "Server";

  return (
    <div className="error" role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
      {status !== undefined && status !== 0 && (
        <p className="muted" style={{ fontSize: "var(--step-1)" }}>
          {kind} error — HTTP {status}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "var(--space-2) var(--space-4)",
            border: "1px solid var(--hairline-strong)",
            borderRadius: "var(--radius-sm)",
            color: "var(--gold)",
            background: "var(--surface-1)",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}