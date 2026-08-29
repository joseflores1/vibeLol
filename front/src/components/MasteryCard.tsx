import { Link, useParams } from "react-router-dom";
import type { ChampionMastery, Champion } from "../types/api";
import "./MasteryCard.css";

interface MasteryCardProps {
  mastery: ChampionMastery;
  champion?: Champion;
  version: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

// Single champion mastery card — icon + mastery level badge + name +
// points (mono gold) + "Last played" caption (AGENTS.md §12: 2x3 grid).
// The whole card links to this summoner's cached matches on the champion.
export function MasteryCard({ mastery, champion, version }: MasteryCardProps) {
  const { gameName, tagLine } = useParams();
  const iconId = champion?.id ?? `${mastery.championId}`;
  const championLabel = champion?.name ?? `champion ${mastery.championId}`;

  return (
    <Link
      className="mastery-card"
      to={`/summoners/${encodeURIComponent(gameName ?? "")}/${encodeURIComponent(tagLine ?? "")}?champion=${mastery.championId}`}
      aria-label={`Matches on ${championLabel}`}
    >
      <div className="champ-icon-wrap">
        <img
          className="champ-icon"
          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${iconId}.png`}
          alt=""
          width={48}
          height={48}
          loading="lazy"
        />
        <span className="mastery-level">{mastery.championLevel}</span>
      </div>
      <span className="champ-name">{champion?.name ?? `#${mastery.championId}`}</span>
      <span className="champ-points">{mastery.championPoints.toLocaleString()}</span>
      <span className="last-played">{timeAgo(mastery.lastPlayTime)}</span>
    </Link>
  );
}