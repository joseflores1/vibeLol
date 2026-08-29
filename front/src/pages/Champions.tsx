import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Loading } from "../components/Loading";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { AnalyticsTabs } from "../components/AnalyticsTabs";
import { queueForTab, type AnalyticsQueueTab } from "../constants/queues";
import { useAnalyticsChampions, useStaticChampions } from "../hooks/useApi";
import { championIconUrl } from "../lib/ddragon";
import type { Champion, ChampionStatRow } from "../types/api";
import "./Champions.css";

// Below this many games a champion's rates are noise (dev-key sample sizes
// are small) — rows are visually muted and flagged instead of hidden.
const LOW_SAMPLE_GAMES = 50;

type SortKey =
  | "games"
  | "winRate"
  | "pickRate"
  | "banRate"
  | "kda";

const SORT_LABELS: Record<SortKey, string> = {
  games: "Games",
  winRate: "Win rate",
  pickRate: "Pick rate",
  banRate: "Ban rate",
  kda: "Avg KDA",
};

function kdaOf(row: ChampionStatRow): number {
  return row.avgDeaths > 0
    ? (row.avgKills + row.avgAssists) / row.avgDeaths
    : row.avgKills + row.avgAssists;
}

function fmtPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

function fmtKda(row: ChampionStatRow): string {
  return `${row.avgKills.toFixed(1)} / ${row.avgDeaths.toFixed(1)} / ${row.avgAssists.toFixed(1)}`;
}

export function ChampionsPage() {
  const [tab, setTab] = useState<AnalyticsQueueTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("games");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [visibleCount, setVisibleCount] = useState(50);

  const queue = queueForTab(tab);
  const query = useAnalyticsChampions(queue);
  const staticChampions = useStaticChampions();

  const championMap = useMemo(() => {
    const m = new Map<number, Champion>();
    for (const c of staticChampions.data?.champions ?? []) m.set(c.key, c);
    return m;
  }, [staticChampions.data]);

  const rows = useMemo(() => {
    const all = query.data?.champions ?? [];
    return [...all].sort((a, b) => {
      const av = sortKey === "kda" ? kdaOf(a) : a[sortKey];
      const bv = sortKey === "kda" ? kdaOf(b) : b[sortKey];
      return (av - bv) * sortDir || a.championId - b.championId;
    });
  }, [query.data, sortKey, sortDir]);

  const visible = rows.slice(0, visibleCount);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  return (
    <>
      <Nav />
      <div className="champions-page">
        <header className="champions-header">
          <h1>Champions</h1>
          <p className="champions-sub">
            Win rates across {query.data?.totalGames.toLocaleString() ?? "—"} cached games.
            Aggregated on the fly — sample grows as profiles are searched.
          </p>
        </header>

        <AnalyticsTabs active={tab} onChange={(t) => { setTab(t); setVisibleCount(50); }} />

        {query.isLoading && <Loading label="Loading champion stats" />}
        {query.isError && (
          <ErrorState
            title="Couldn't load champion stats"
            message={(query.error as { message?: string })?.message ?? "Unknown error."}
            status={(query.error as { status?: number })?.status}
            onRetry={() => query.refetch()}
          />
        )}

        {query.data && rows.length === 0 && (
          <EmptyState
            title="No games in the cache yet."
            hint="Search a summoner's profile to start collecting matches."
          />
        )}

        {query.data && rows.length > 0 && (
          <>
            <table className="champions-table">
              <thead>
                <tr>
                  <th scope="col" className="col-champion">Champion</th>
                  {(
                    [
                      "games",
                      "winRate",
                      "pickRate",
                      "banRate",
                      "kda",
                    ] as SortKey[]
                  ).map((key) => (
                    <th
                      key={key}
                      scope="col"
                      className="col-num"
                      aria-sort={
                        sortKey === key
                          ? sortDir === 1 ? "ascending" : "descending"
                          : undefined
                      }
                    >
                      <button className="th-sort" onClick={() => toggleSort(key)}>
                        {SORT_LABELS[key]}
                        {sortKey === key && <span aria-hidden="true">{sortDir === 1 ? " ▲" : " ▼"}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const champion = championMap.get(row.championId);
                  const lowSample = row.games < LOW_SAMPLE_GAMES;
                  return (
                    <tr key={row.championId} className={lowSample ? "low-sample" : undefined}>
                      <td className="col-champion">
                        <Link
                          className="champion-cell"
                          to={`/champions/${row.championId}${queue ? `?queue=${queue}` : ""}`}
                        >
                          <img
                            src={championIconUrl(
                              staticChampions.data?.version ?? "",
                              champion?.id ?? String(row.championId),
                            )}
                            alt=""
                            width={28}
                            height={28}
                            loading="lazy"
                          />
                          <span className="champion-name">
                            {champion?.name ?? `Champion ${row.championId}`}
                          </span>
                          {lowSample && <span className="low-sample-chip">low sample</span>}
                        </Link>
                      </td>
                      <td className="col-num numeric">{row.games}</td>
                      <td className="col-num">
                        <span className="numeric win-cell">{fmtPct(row.winRate)}</span>
                        <span
                          className={`win-bar ${row.winRate >= 0.5 ? "above" : "below"}`}
                          style={{ "--win-w": `${Math.min(row.winRate * 100, 100)}%` } as React.CSSProperties}
                          aria-hidden="true"
                        />
                      </td>
                      <td className="col-num numeric">{fmtPct(row.pickRate)}</td>
                      <td className="col-num numeric">{fmtPct(row.banRate)}</td>
                      <td className="col-num numeric">{fmtKda(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visible.length < rows.length && (
              <div className="load-more">
                <button onClick={() => setVisibleCount((n) => n + 50)}>
                  Load more ({rows.length - visible.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
