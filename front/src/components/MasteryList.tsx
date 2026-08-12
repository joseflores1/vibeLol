import type { ChampionMastery, Champion } from "../types/api";
import "./MasteryList.css";

interface MasteryListProps {
  masteries: ChampionMastery[];
  champions: Map<number, Champion>;
  version: string;
  // Frontend sorts/slices the full list locally. Default: top 5.
  limit?: number;
}

// MasteryList — top-N champion mastery with icon + name + level + points.
// Frontend sorts/slices locally (per AGENTS.md §5a, no /top Riot call).
export function MasteryList({ masteries, champions, version, limit = 5 }: MasteryListProps) {
  const top = [...masteries]
    .sort((a, b) => b.championPoints - a.championPoints)
    .slice(0, limit);

  if (top.length === 0) {
    return (
      <p className="muted">No champion mastery recorded yet.</p>
    );
  }

  return (
    <ul className="mastery-list">
      {top.map((m) => {
        const champ = champions.get(m.championId);
        // Data Dragon icon URL uses the alphabetic ID (e.g., "Aatrox",
        // "MonkeyKing"), not the numeric key or display name. Our
        // backend's /static/champions endpoint returns both `id`
        // (alphabetic, for icon URLs) and `name` (display, for UI).
        const iconChampionId = champ?.id ?? champ?.name ?? `${m.championId}`;
        return (
          <li key={`${m.puuid}-${m.championId}`} className="mastery-row">
            {champ && (
              <img
                className="mastery-icon"
                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${iconChampionId}.png`}
                alt=""
                width={36}
                height={36}
                loading="lazy"
              />
            )}
            <span className="name">{champ?.name ?? `Champion #${m.championId}`}</span>
            <span className="level">Lvl {m.championLevel}</span>
            <span className="points">{m.championPoints.toLocaleString()}</span>
          </li>
        );
      })}
    </ul>
  );
}