import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Loading } from "../components/Loading";
import { ErrorState } from "../components/ErrorState";
import { ParticipantRow } from "../components/ParticipantRow";
import { TimelineSection } from "../components/TimelineChart";
import {
  useMatchDetail,
  useSummonerProfile,
  useStaticVersion,
  useStaticChampions,
  useStaticSpells,
  useStaticRunes,
  useStaticQueues,
  useStaticItems,
} from "../hooks/useApi";
import { assertRegion, regionDisplayName } from "../constants/regions";
import { positionRank } from "../lib/match";
import type {
  Champion,
  Spell,
  Rune,
  Item,
  MatchParticipant,
  MatchTeam,
  QueueDefinition,
} from "../types/api";
import "./MatchDetail.css";

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TeamPanelProps {
  teamId: number;
  team: MatchTeam | undefined;
  participants: MatchParticipant[];
  version: string;
  championMap: Map<number, Champion>;
  spellMap: Map<number, Spell>;
  runeMap: Map<number, Rune>;
  itemMap: Map<number, Item>;
  youPuuid: string | undefined;
}

// One half of the diptych: a team banner (win color + objectives) over the
// participant rows, sorted top → jungle → mid → bot → support.
function TeamPanel({
  teamId,
  team,
  participants,
  version,
  championMap,
  spellMap,
  runeMap,
  itemMap,
  youPuuid,
}: TeamPanelProps) {
  const side = teamId === 100 ? "blue" : "red";
  const sorted = useMemo(
    () => [...participants].sort((a, b) => positionRank(a.teamPosition) - positionRank(b.teamPosition)),
    [participants],
  );

  return (
    <section
      className={`team-panel ${side}`}
      style={{ "--team-color": side === "blue" ? "var(--blue-team)" : "var(--red-team)" } as React.CSSProperties}
    >
      <header className="team-banner">
        <strong className="team-name">{side === "blue" ? "Blue Side" : "Red Side"}</strong>
        {team && (
          <span className={`team-verdict ${team.win ? "win" : "loss"}`}>
            {team.win ? "Victory" : "Defeat"}
          </span>
        )}
        {team && (
          <span className="team-objectives">
            <span className="numeric">{team.totalKills}</span> kills ·{" "}
            <span className="numeric">{team.towerKills}</span> towers ·{" "}
            <span className="numeric">{team.baronKills}</span> barons ·{" "}
            <span className="numeric">{team.dragonKills}</span> dragons ·{" "}
            <span className="numeric">{(team.totalGoldEarned / 1000).toFixed(1)}k</span> gold
          </span>
        )}
      </header>
      <div className="team-rows">
        {sorted.map((p) => (
          <ParticipantRow
            key={p.puuid}
            participant={p}
            version={version}
            championMap={championMap}
            spellMap={spellMap}
            runeMap={runeMap}
            itemMap={itemMap}
            isYou={p.puuid === youPuuid}
          />
        ))}
      </div>
    </section>
  );
}

export function MatchDetailPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const gameName = params.gameName ?? "";
  const tagLine = params.tagLine ?? "";
  const matchId = params.matchId ?? "";
  const region = assertRegion(searchParams.get("region"));

  const match = useMatchDetail(gameName, tagLine, region, matchId);
  const profile = useSummonerProfile(gameName, tagLine, region);
  const staticVersion = useStaticVersion();
  const staticChampions = useStaticChampions();
  const staticSpells = useStaticSpells();
  const staticRunes = useStaticRunes();
  const staticQueues = useStaticQueues();
  const staticItems = useStaticItems();

  // Static lookup maps — built once from the backend's /static endpoints
  // (staleTime Infinity, so these datasets are session-constant).
  const championMap = useMemo(() => {
    const m = new Map<number, Champion>();
    for (const c of staticChampions.data?.champions ?? []) m.set(c.key, c);
    return m;
  }, [staticChampions.data]);

  const spellMap = useMemo(() => {
    const m = new Map<number, Spell>();
    for (const s of staticSpells.data?.spells ?? []) m.set(s.key, s);
    return m;
  }, [staticSpells.data]);

  const runeMap = useMemo(() => {
    const m = new Map<number, Rune>();
    for (const r of staticRunes.data?.runes ?? []) m.set(r.id, r);
    return m;
  }, [staticRunes.data]);

  const queueMap = useMemo(() => {
    const m = new Map<number, QueueDefinition>();
    for (const q of staticQueues.data?.queues ?? []) m.set(q.id, q);
    return m;
  }, [staticQueues.data]);

  const itemMap = useMemo(() => {
    const m = new Map<number, Item>();
    for (const i of staticItems.data?.items ?? []) m.set(i.id, i);
    return m;
  }, [staticItems.data]);

  const version = staticVersion.data?.version ?? "";
  const youPuuid = profile.data?.account.puuid;

  if (match.isLoading) {
    return (
      <>
        <Nav initialGameName={gameName} initialTagLine={tagLine} initialRegion={region} />
        <div className="match-detail"><Loading label="Loading match" /></div>
        <Footer />
      </>
    );
  }

  if (match.isError || !match.data) {
    return (
      <>
        <Nav initialGameName={gameName} initialTagLine={tagLine} initialRegion={region} />
        <div className="match-detail">
          <ErrorState
            title="Couldn't load this match"
            message={(match.error as { message?: string })?.message ?? "Unknown error."}
            status={(match.error as { status?: number })?.status}
            onRetry={() => match.refetch()}
          />
        </div>
        <Footer />
      </>
    );
  }

  const m = match.data;
  const you = m.participants.find((p) => p.puuid === youPuuid);
  const queueName =
    (m.queueId != null ? queueMap.get(m.queueId)?.name : undefined) ?? m.gameMode;
  const blueSide = m.participants.filter((p) => p.teamId === 100);
  const redSide = m.participants.filter((p) => p.teamId === 200);
  const profilePath = `/summoners/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?region=${region}`;

  return (
    <>
      <Nav initialGameName={gameName} initialTagLine={tagLine} initialRegion={region} />

      <div className="match-detail">
        <Link to={profilePath} className="md-back">
          ← Back to {gameName}#{tagLine}
        </Link>

        <header className="md-header">
          <div className="md-title">
            <h1 className="md-queue">{queueName}</h1>
            <span className="md-meta">
              {new Date(m.gameStartTimestamp).toLocaleString()} ·{" "}
              <span className="numeric">{fmtDuration(m.gameDuration)}</span> ·{" "}
              {regionDisplayName(region)} · patch {m.gameVersion ?? "—"}
            </span>
          </div>
          {you && (
            <span className={`md-verdict ${you.win ? "win" : "loss"}`}>
              {you.win ? "Victory" : "Defeat"}
            </span>
          )}
        </header>

        <div className="md-teams">
          <TeamPanel
            teamId={100}
            team={m.teams.find((t) => t.teamId === 100)}
            participants={blueSide}
            version={version}
            championMap={championMap}
            spellMap={spellMap}
            runeMap={runeMap}
            itemMap={itemMap}
            youPuuid={youPuuid}
          />
          <TeamPanel
            teamId={200}
            team={m.teams.find((t) => t.teamId === 200)}
            participants={redSide}
            version={version}
            championMap={championMap}
            spellMap={spellMap}
            runeMap={runeMap}
            itemMap={itemMap}
            youPuuid={youPuuid}
          />
        </div>

        <TimelineSection
          matchId={m.matchId}
          region={region}
          match={m}
          version={version}
          championMap={championMap}
          youPuuid={youPuuid}
        />
      </div>

      <Footer />
    </>
  );
}
