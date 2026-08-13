import "./MatchHistoryPreview.css";

// Match history preview — the "reservation card" for the match-history
// column. Shows the blue/red team-color diptych visual sketch (the
// signature element per AGENTS.md §12), with a clear "coming in PR #9"
// caption. The diptych layout is honest about upcoming work — not a
// broken empty state, not a vague "coming soon."
export function MatchHistoryPreview() {
  return (
    <div className="match-preview">
      <div className="diptych">
        <div className="side blue">
          <h4>Blue Side</h4>
          <span className="placeholder">
            Match history arrives in the next update —
            champion + KDA + items per player.
          </span>
        </div>
        <div className="side red">
          <h4>Red Side</h4>
          <span className="placeholder">
            Each match card renders the full diptych:
            blue team left, red team right.
          </span>
        </div>
      </div>
      <p className="availability-note">
        Live match data wire-up arrives in PR #9.
      </p>
    </div>
  );
}