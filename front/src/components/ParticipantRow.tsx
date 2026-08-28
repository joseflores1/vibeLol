import type { MatchParticipant, Champion, Spell, Rune } from "../types/api";
import { championIconUrl, itemIconUrl, spellIconUrl, runeIconUrl } from "../lib/ddragon";
import { keystonePerkId } from "../lib/match";
import "./ParticipantRow.css";

interface ParticipantRowProps {
  participant: MatchParticipant;
  version: string;
  championMap: Map<number, Champion>;
  spellMap: Map<number, Spell>;
  runeMap: Map<number, Rune>;
  // Highlights the searched player's row (gold edge + raised surface).
  isYou: boolean;
}

// One participant line inside a team panel — the dense stat row you'd find
// on op.gg's match detail: champion + level | spells + keystone | Riot ID |
// KDA (gold mono) | items | CS | gold | vision.
export function ParticipantRow({
  participant: p,
  version,
  championMap,
  spellMap,
  runeMap,
  isYou,
}: ParticipantRowProps) {
  const champion = championMap.get(p.championId);
  const champIconId = champion?.id ?? p.championName;
  const keystoneId = keystonePerkId(p.perks);
  const keystone = keystoneId != null ? runeMap.get(keystoneId) : undefined;
  const spell1 = spellMap.get(p.summoner1Id);
  const spell2 = spellMap.get(p.summoner2Id);
  const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
  const goldK = (p.goldEarned / 1000).toFixed(1);
  const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];
  const riotId = p.riotIdGameName
    ? `${p.riotIdGameName}${p.riotIdTagline ? `#${p.riotIdTagline}` : ""}`
    : "Unknown";

  return (
    <div className={`participant-row${isYou ? " you" : ""}`}>
      <div className="pr-champion">
        <img
          className="pr-champ-icon"
          src={championIconUrl(version, champIconId)}
          alt={champion?.name ?? p.championName}
          width={32}
          height={32}
          loading="lazy"
        />
        {p.champLevel != null && (
          <span className="pr-level numeric">{p.champLevel}</span>
        )}
      </div>

      <div className="pr-loadout">
        <span className="pr-spells">
          {spell1 ? (
            <img
              className="pr-spell"
              src={spellIconUrl(version, spell1.id)}
              alt={spell1.name}
              width={16}
              height={16}
              loading="lazy"
            />
          ) : (
            <span className="pr-spell empty" />
          )}
          {spell2 ? (
            <img
              className="pr-spell"
              src={spellIconUrl(version, spell2.id)}
              alt={spell2.name}
              width={16}
              height={16}
              loading="lazy"
            />
          ) : (
            <span className="pr-spell empty" />
          )}
        </span>
        {keystone && (
          <img
            className="pr-keystone"
            src={runeIconUrl(keystone.icon)}
            alt={keystone.name}
            width={18}
            height={18}
            loading="lazy"
          />
        )}
      </div>

      <span className="pr-name" title={riotId}>{riotId}</span>

      <span className="pr-kda numeric">
        {p.kills}/{p.deaths}/{p.assists}
      </span>

      <div className="pr-items">
        {items.map((itemId, i) =>
          itemId == null ? (
            <span key={i} className="pr-item empty" />
          ) : (
            <img
              key={i}
              className="pr-item"
              src={itemIconUrl(version, itemId)}
              alt={`Item ${itemId}`}
              width={20}
              height={20}
              loading="lazy"
            />
          ),
        )}
      </div>

      <span className="pr-stat"><span className="numeric">{cs}</span> CS</span>
      <span className="pr-stat"><span className="numeric">{goldK}k</span> gold</span>
      {p.visionScore != null && (
        <span className="pr-stat"><span className="numeric">{p.visionScore}</span> vision</span>
      )}
    </div>
  );
}
