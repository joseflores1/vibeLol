import type { MatchDetail, MatchParticipant, Champion, Spell, Rune, Item } from "../types/api";
import { championIconUrl, itemIconUrl, spellIconUrl, runeIconUrl } from "../lib/ddragon";
import { keystonePerkId, secondaryPerkId } from "../lib/match";
import "./MatchCard.css";

interface MatchCardProps {
  match: MatchDetail;
  // The searched player's puuid — used to find "your row" in participants
  // and to drive the win/loss team-color stripe.
  puuid: string;
  version: string;
  championMap: Map<number, Champion>;
  spellMap: Map<number, Spell>;
  runeMap: Map<number, Rune>;
  itemMap: Map<number, Item>;
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtKda(k: number, d: number, a: number): { line: string; ratio: string } {
  const line = `${k}/${d}/${a}`;
  const ratio = d === 0 ? "Perfect" : ((k + a) / d).toFixed(2);
  return { line, ratio };
}

// Single match row — 96px height, 4px left-edge team-color stripe (blue for
// win, red for loss — AGENTS.md §12). Layout columns: outcome | champion +
// spell row | KDA (gold mono) | items | stat meta (gold earned + CS +
// vision) | game mode + duration + timestamp.
export function MatchCard({ match, puuid, version, championMap, spellMap, runeMap, itemMap }: MatchCardProps) {
  const you = match.participants.find((p) => p.puuid === puuid) as
    | MatchParticipant
    | undefined;

  if (!you) {
    // Defensive — backend should never lose a participant we just asked
    // about, but if a row is missing we render an honest stripe-less row.
    return (
      <div className="match-card missing">
        <span className="outcome">
          Match {match.matchId} — your stats unavailable.
        </span>
      </div>
    );
  }

  const win = you.win;
  const stripeClass = win ? "win" : "loss";
  const teamColor = win ? "var(--blue-team)" : "var(--red-team)";
  const { line: kdaLine, ratio: kdaRatio } = fmtKda(you.kills, you.deaths, you.assists);
  const champion = championMap.get(you.championId);
  const champIconId = champion?.id ?? you.championName;
  const cs = you.totalMinionsKilled ?? 0;
  const goldK = (you.goldEarned / 1000).toFixed(1);
  const items = [you.item0, you.item1, you.item2, you.item3, you.item4, you.item5, you.item6];
  const spell1 = spellMap.get(you.summoner1Id);
  const spell2 = spellMap.get(you.summoner2Id);
  const keystoneId = keystonePerkId(you.perks);
  const keystone = keystoneId != null ? runeMap.get(keystoneId) : undefined;
  const secondaryId = secondaryPerkId(you.perks);
  const secondaryRune = secondaryId != null ? runeMap.get(secondaryId) : undefined;
  const startedAt = new Date(match.gameStartTimestamp);
  const modeLabel = match.gameMode ?? "Match";

  function itemName(itemId: number | null): string | null {
    if (itemId == null) return null;
    return itemMap.get(itemId)?.name ?? `Item ${itemId}`;
  }

  return (
    <div className={`match-card ${stripeClass}`} style={{ "--team-color": teamColor } as React.CSSProperties}>
      <div className="outcome">
        <strong className="verdict">{win ? "Victory" : "Defeat"}</strong>
        <span className="duration">{fmtDuration(match.gameDuration)}</span>
      </div>

      <div className="champion-block">
        <img
          className="champ-icon"
          src={championIconUrl(version, champIconId)}
          alt={champion?.name ?? you.championName}
          width={40}
          height={40}
          loading="lazy"
        />
        <span className="champ-name">{champion?.name ?? you.championName}</span>
        <span className="champ-loadout">
          {spell1 ? (
            <img
              className="mini-icon"
              src={spellIconUrl(version, spell1.id)}
              alt={spell1.name}
              width={16}
              height={16}
              loading="lazy"
            />
          ) : (
            <span className="mini-icon empty" />
          )}
          {spell2 ? (
            <img
              className="mini-icon"
              src={spellIconUrl(version, spell2.id)}
              alt={spell2.name}
              width={16}
              height={16}
              loading="lazy"
            />
          ) : (
            <span className="mini-icon empty" />
          )}
          {keystone && (
            <img
              className="mini-icon keystone"
              src={runeIconUrl(keystone.icon)}
              alt={keystone.name}
              title={keystone.name}
              width={16}
              height={16}
              loading="lazy"
            />
          )}
          {secondaryRune && (
            <img
              className="mini-icon rune"
              src={runeIconUrl(secondaryRune.icon)}
              alt={secondaryRune.name}
              title={secondaryRune.name}
              width={16}
              height={16}
              loading="lazy"
            />
          )}
        </span>
      </div>

      <div className="kda">
        <span className="kda-line">{kdaLine}</span>
        <span className="kda-ratio">{kdaRatio} KDA</span>
      </div>

      <div className="items">
        {items.map((itemId, i) => {
          const name = itemName(itemId);
          return name == null ? (
            <span key={i} className="item-slot empty" />
          ) : (
            <img
              key={i}
              className="item-slot"
              src={itemIconUrl(version, itemId!)}
              alt={name}
              title={name}
              width={22}
              height={22}
              loading="lazy"
            />
          );
        })}
      </div>

      <div className="stats">
        <span className="stat"><span className="numeric">{goldK}k</span> gold</span>
        <span className="stat"><span className="numeric">{cs}</span> CS</span>
        {you.visionScore != null && (
          <span className="stat"><span className="numeric">{you.visionScore}</span> vision</span>
        )}
      </div>

      <div className="footer-meta">
        <span className="mode">{modeLabel}</span>
        <span className="time">{startedAt.toLocaleDateString()}</span>
      </div>
    </div>
  );
}