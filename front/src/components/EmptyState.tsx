import "./States.css";
import { SearchBar } from "./SearchBar";

// Empty State — per the frontend-design skill's writing guidance: an
// empty screen is an invitation to act. Never vague, never apologetic.
// Provide the next concrete thing the user can do (here: search).
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty" role="status">
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      <SearchBar />
    </div>
  );
}