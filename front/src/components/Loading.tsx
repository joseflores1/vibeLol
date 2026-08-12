import "./Loading.css";

// Loading — used in suspense of any data fetch.
export function Loading({ label = "Loading" }: { label?: string }) {
  return <div className="loading" role="status" aria-live="polite">{label}…</div>;
}