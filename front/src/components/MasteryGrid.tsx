import type { ChampionMastery, Champion } from "../types/api";
import { MasteryCard } from "./MasteryCard";
import "./MasteryGrid.css";

interface MasteryGridProps {
  masteries: ChampionMastery[];
  champions: Map<number, Champion>;
  version: string;
  limit?: number;
}

// Replaces the old flat MasteryList with a 2-D card grid (per AGENTS.md §12:
// 2x3+ grid, dense). Frontend sorts/slices locally — no /top Riot endpoint.
export function MasteryGrid({ masteries, champions, version, limit = 6 }: MasteryGridProps) {
  const top = [...masteries]
    .sort((a, b) => b.championPoints - a.championPoints)
    .slice(0, limit);

  if (top.length === 0) {
    return <p className="muted">No champion mastery recorded yet.</p>;
  }

  return (
    <div className="mastery-grid">
      {top.map((m) => (
        <MasteryCard
          key={`${m.puuid}-${m.championId}`}
          mastery={m}
          champion={champions.get(m.championId)}
          version={version}
        />
      ))}
    </div>
  );
}