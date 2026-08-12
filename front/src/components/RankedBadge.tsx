import type { LeagueEntry } from "../types/api";
import "./RankedBadge.css";

interface RankedBadgeProps {
  entry: LeagueEntry;
}

// Maps Riot's queueType enum to a short human label.
function queueLabel(queueType: string): string {
  switch (queueType) {
    case "RANKED_SOLO_5x5": return "Solo / Duo";
    case "RANKED_FLEX_SR":  return "Flex";
    case "RANKED_TFT":      return "TFT";
    case "RANKED_FLEX_TT":  return "Flex TT";
    default:                return queueType;
  }
}

// RankedBadge — the ranked-tier colored stripe is the first hint of
// Option B's signature visual system: tier color appears as a 6px left
// stripe on each ranked card. The full diptych team-color treatment is
// reserved for PR #9's match detail.
export function RankedBadge({ entry }: RankedBadgeProps) {
  const totalGames = entry.wins + entry.losses;
  const winrate = totalGames > 0
    ? Math.round((entry.wins / totalGames) * 100)
    : 0;

  return (
    <div className="ranked-badge" data-tier={entry.tier}>
      <span className="queue-label">{queueLabel(entry.queueType)}</span>
      <div className="tier-row">
        <span className="tier-name">{entry.tier}</span>
        <span className="tier-rank">{entry.rank}</span>
        <span className="lp"><span className="numeric">{entry.leaguePoints}</span> LP</span>
      </div>
      <div className="winrate">
        <span className="wins">{entry.wins}W</span>
        <span className="losses">{entry.losses}L</span>
        <span>{winrate}%</span>
      </div>
    </div>
  );
}