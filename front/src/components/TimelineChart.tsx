import { useMemo, useState } from "react";
import { useTimeline } from "../hooks/useApi";
import { Loading } from "./Loading";
import { ErrorState } from "./ErrorState";
import { championIconUrl } from "../lib/ddragon";
import type { Champion, MatchDetail, TimelineFrame, TimelineResponse } from "../types/api";
import "./TimelineChart.css";

type TimelineMetric = "gold" | "cs" | "damage";

const METRIC_LABELS: Record<TimelineMetric, string> = {
  gold: "Gold",
  cs: "CS",
  damage: "Damage",
};

// Value extractors — per participant per frame. Timeline fields are sparse
// across data versions, so each falls back defensively.
function frameValue(frame: TimelineFrame, participantId: number, metric: TimelineMetric): number {
  const pf = frame.participantFrames[String(participantId)];
  if (!pf) return 0;
  switch (metric) {
    case "gold":
      return pf.totalGold ?? 0;
    case "cs":
      return pf.minionsKilled
        ?? ((pf.laneMinionsKilled ?? 0) + (pf.jungleMinionsKilled ?? 0));
    case "damage":
      return pf.damageStats?.totalDamageDoneToChampions ?? 0;
  }
}

function fmtAxisValue(v: number): string {
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

interface TimelineChartProps {
  timeline: TimelineResponse;
  match: MatchDetail;
  version: string;
  championMap: Map<number, Champion>;
  youPuuid: string | undefined;
}

// Hand-rolled SVG line chart (no chart lib — design-system control, zero
// deps): one line per participant, blue/red by team, the searched player
// highlighted in gold. Static render — no animation, so
// prefers-reduced-motion holds by construction.
export function TimelineChart({ timeline, match, version, championMap, youPuuid }: TimelineChartProps) {
  const [metric, setMetric] = useState<TimelineMetric>("gold");

  const W = 800;
  const H = 240;
  const PAD = { top: 12, right: 16, bottom: 24, left: 48 };

  const series = useMemo(() => {
    return match.participants.map((participant) => {
      const participantId = timeline.puuids.indexOf(participant.puuid) + 1;
      const points = timeline.frames.map((frame) => ({
        t: frame.timestamp / 60_000,
        v: participantId > 0 ? frameValue(frame, participantId, metric) : 0,
      }));
      return {
        participant,
        participantId,
        isYou: participant.puuid === youPuuid,
        points,
      };
    });
  }, [timeline, match.participants, metric, youPuuid]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const s of series) {
      for (const p of s.points) if (p.v > max) max = p.v;
    }
    return max;
  }, [series]);

  const durationMin = Math.max(
    1,
    Math.ceil((timeline.frames[timeline.frames.length - 1]?.timestamp ?? 60_000) / 60_000),
  );

  const x = (t: number) => PAD.left + (t / durationMin) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    H - PAD.bottom - (maxValue > 0 ? v / maxValue : 0) * (H - PAD.top - PAD.bottom);

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="timeline-chart">
      <div className="tl-metrics" role="group" aria-label="Chart metric">
        {(Object.keys(METRIC_LABELS) as TimelineMetric[]).map((m) => (
          <button
            key={m}
            className={m === metric ? "tab active" : "tab"}
            onClick={() => setMetric(m)}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="tl-svg"
        role="img"
        aria-label={`${METRIC_LABELS[metric]} over time for all ten participants`}
      >
        {gridLines.map((g) => {
          const gy = PAD.top + g * (H - PAD.top - PAD.bottom);
          const value = maxValue * (1 - g);
          return (
            <g key={g}>
              <line x1={PAD.left} x2={W - PAD.right} y1={gy} y2={gy} className="tl-grid" />
              <text x={PAD.left - 6} y={gy + 3} textAnchor="end" className="tl-axis-label">
                {fmtAxisValue(value)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: Math.floor(durationMin / 5) + 1 }, (_, i) => i * 5).map((m) => (
          <text key={m} x={x(m)} y={H - 6} textAnchor="middle" className="tl-axis-label">
            {m}m
          </text>
        ))}

        {series.map((s) => (
          <polyline
            key={s.participant.puuid}
            className={`tl-line ${s.isYou ? "you" : s.participant.teamId === 100 ? "blue" : "red"}`}
            points={s.points.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}
          >
            <title>
              {s.participant.riotIdGameName ?? s.participant.championName} — {METRIC_LABELS[metric]}
            </title>
          </polyline>
        ))}
      </svg>

      <div className="tl-legend">
        {series.map((s) => {
          const champion = championMap.get(s.participant.championId);
          return (
            <span
              key={s.participant.puuid}
              className={`tl-legend-item ${s.isYou ? "you" : ""}`}
            >
              <img
                src={championIconUrl(version, champion?.id ?? s.participant.championName)}
                alt=""
                width={18}
                height={18}
                loading="lazy"
              />
              {s.participant.riotIdGameName ?? s.participant.championName}
            </span>
          );
        })}
      </div>
    </div>
  );
}

interface TimelineSectionProps {
  matchId: string;
  region: import("../hooks/useApi").RiotRegion;
  match: MatchDetail;
  version: string;
  championMap: Map<number, Champion>;
  youPuuid: string | undefined;
}

// The match-detail toggle. The timeline payload is heavy (~hundreds of KB
// served, ~1MB fetched from Riot on first miss), so the fetch only happens
// once the user expands the section.
export function TimelineSection({
  matchId,
  region,
  match,
  version,
  championMap,
  youPuuid,
}: TimelineSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const timeline = useTimeline(expanded ? matchId : undefined, region);

  return (
    <section className="timeline-section">
      <button className="tl-toggle" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
        {expanded ? "Hide match flow ▲" : "Show match flow ▼"}
      </button>

      {expanded && timeline.isLoading && <Loading label="Loading match flow" />}
      {expanded && timeline.isError && (
        <ErrorState
          title="Couldn't load the match flow"
          message={(timeline.error as { message?: string })?.message ?? "Unknown error."}
          status={(timeline.error as { status?: number })?.status}
          onRetry={() => timeline.refetch()}
        />
      )}
      {expanded && timeline.data && (
        <TimelineChart
          timeline={timeline.data}
          match={match}
          version={version}
          championMap={championMap}
          youPuuid={youPuuid}
        />
      )}
    </section>
  );
}
