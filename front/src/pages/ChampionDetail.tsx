import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Loading } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { AnalyticsTabs } from "../components/AnalyticsTabs";
import { queueForTab, type AnalyticsQueueTab } from "../constants/queues";
import { useChampionDetail, useStaticChampions, useStaticItems, useStaticRunes, useStaticSpells } from "../hooks/useApi";
import { championIconUrl, itemIconUrl, runeIconUrl, spellIconUrl } from "../lib/ddragon";
import type { Champion, Item, Rune, Spell } from "../types/api";
import "./ChampionDetail.css";

function fmtPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

function fmtNum(n: number): string {
  return n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(n % 1 === 0 ? 0 : 1);
}

// Lane ordering for the position bars.
const POSITION_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY", "UNKNOWN"];

export function ChampionDetailPage() {
  const params = useParams();
  const championId = Number(params.championId);
  const [tab, setTab] = useState<AnalyticsQueueTab>("all");
  const queue = queueForTab(tab);

  const detail = useChampionDetail(
    Number.isFinite(championId) ? championId : undefined,
    queue,
  );
  const staticChampions = useStaticChampions();
  const staticItems = useStaticItems();
  const staticRunes = useStaticRunes();
  const staticSpells = useStaticSpells();

  const championMap = useMemo(() => {
    const m = new Map<number, Champion>();
    for (const c of staticChampions.data?.champions ?? []) m.set(c.key, c);
    return m;
  }, [staticChampions.data]);

  const itemMap = useMemo(() => {
    const m = new Map<number, Item>();
    for (const i of staticItems.data?.items ?? []) m.set(i.id, i);
    return m;
  }, [staticItems.data]);

  const runeMap = useMemo(() => {
    const m = new Map<number, Rune>();
    for (const r of staticRunes.data?.runes ?? []) m.set(r.id, r);
    return m;
  }, [staticRunes.data]);

  const spellMap = useMemo(() => {
    const m = new Map<number, Spell>();
    for (const s of staticSpells.data?.spells ?? []) m.set(s.key, s);
    return m;
  }, [staticSpells.data]);

  const version = staticChampions.data?.version ?? "";
  const champion = championMap.get(championId);

  return (
    <>
      <Nav />
      <div className="champion-detail">
        <Link to="/champions" className="cd-back">← All champions</Link>

        {detail.isLoading && <Loading label="Loading champion stats" />}
        {detail.isError && (
          <ErrorState
            title="Couldn't load this champion"
            message={(detail.error as { message?: string })?.message ?? "Unknown error."}
            status={(detail.error as { status?: number })?.status}
            onRetry={() => detail.refetch()}
          />
        )}

        {detail.data && (
          <>
            <header className="cd-header">
              <img
                className="cd-portrait"
                src={championIconUrl(version, champion?.id ?? String(championId))}
                alt={champion?.name ?? `Champion ${championId}`}
                width={72}
                height={72}
              />
              <div className="cd-identity">
                <h1>{champion?.name ?? `Champion ${championId}`}</h1>
                {champion && <p className="cd-title">{champion.title}</p>}
              </div>
            </header>

            <AnalyticsTabs active={tab} onChange={setTab} />

            {detail.data.games === 0 ? (
              <EmptyState
                title="No games for this champion yet."
                hint="Stats appear as profiles are searched and matches cache."
              />
            ) : (
              <>
                <section className="cd-statband" aria-label="Overview">
                  <div className="cd-stat">
                    <span className="cd-stat-label">Win rate</span>
                    <span className="cd-stat-value numeric">{fmtPct(detail.data.winRate)}</span>
                  </div>
                  <div className="cd-stat">
                    <span className="cd-stat-label">Ban rate</span>
                    <span className="cd-stat-value numeric">{fmtPct(detail.data.banRate)}</span>
                  </div>
                  <div className="cd-stat">
                    <span className="cd-stat-label">Games</span>
                    <span className="cd-stat-value numeric">{detail.data.games}</span>
                  </div>
                  <div className="cd-stat">
                    <span className="cd-stat-label">KDA</span>
                    <span className="cd-stat-value numeric">
                      {detail.data.avgKills.toFixed(1)} / {detail.data.avgDeaths.toFixed(1)} / {detail.data.avgAssists.toFixed(1)}
                    </span>
                  </div>
                </section>

                <div className="cd-columns">
                  <section className="cd-panel" aria-label="Positions">
                    <h2 className="cd-panel-title">Positions</h2>
                    {detail.data.positions.length === 0 && (
                      <p className="cd-muted">No position data.</p>
                    )}
                    {detail.data.positions
                      .slice()
                      .sort((a, b) =>
                        POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
                      .map((pos) => (
                        <div key={pos.position} className="cd-position-row">
                          <span className="cd-position-name">{pos.position}</span>
                          <span className="cd-position-bar" aria-hidden="true">
                            <span
                              className={`cd-position-fill ${pos.winRate >= 0.5 ? "above" : "below"}`}
                              style={{ width: `${Math.min(pos.winRate * 100, 100)}%` }}
                            />
                          </span>
                          <span className="numeric cd-position-rate">{fmtPct(pos.winRate)}</span>
                          <span className="cd-muted">{pos.games} games</span>
                        </div>
                      ))}
                  </section>

                  <section className="cd-panel" aria-label="Most popular items">
                    <h2 className="cd-panel-title">Popular items</h2>
                    <div className="cd-icon-grid">
                      {detail.data.items.slice(0, 6).map((row) => {
                        const item = itemMap.get(row.id);
                        return (
                          <div key={row.id} className="cd-icon-cell" title={item?.name ?? `Item ${row.id}`}>
                            <img
                              src={itemIconUrl(version, row.id)}
                              alt={item?.name ?? `Item ${row.id}`}
                              width={32}
                              height={32}
                              loading="lazy"
                            />
                            <span className="cd-icon-caption numeric">{fmtPct(row.pickRate)}</span>
                          </div>
                        );
                      })}
                      {detail.data.items.length === 0 && <p className="cd-muted">No item data.</p>}
                    </div>
                  </section>

                  <section className="cd-panel" aria-label="Keystones and spells">
                    <h2 className="cd-panel-title">Keystones</h2>
                    <div className="cd-icon-grid">
                      {detail.data.keystones.slice(0, 3).map((row) => {
                        const rune = runeMap.get(row.id);
                        return (
                          <div key={row.id} className="cd-icon-cell" title={rune?.name ?? `Rune ${row.id}`}>
                            <img
                              className="cd-rune"
                              src={runeIconUrl(rune?.icon ?? "")}
                              alt={rune?.name ?? `Rune ${row.id}`}
                              width={32}
                              height={32}
                              loading="lazy"
                            />
                            <span className="cd-icon-caption numeric">{fmtPct(row.pickRate)}</span>
                          </div>
                        );
                      })}
                      {detail.data.keystones.length === 0 && <p className="cd-muted">No rune data.</p>}
                    </div>

                    <h2 className="cd-panel-title">Summoner spells</h2>
                    <div className="cd-icon-grid">
                      {detail.data.spells.slice(0, 4).map((row) => {
                        const spell = spellMap.get(row.id);
                        return (
                          <div key={row.id} className="cd-icon-cell" title={spell?.name ?? `Spell ${row.id}`}>
                            <img
                              src={spellIconUrl(version, spell?.id ?? String(row.id))}
                              alt={spell?.name ?? `Spell ${row.id}`}
                              width={32}
                              height={32}
                              loading="lazy"
                            />
                            <span className="cd-icon-caption numeric">{fmtPct(row.pickRate)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <section className="cd-panel" aria-label="Matchups">
                  <h2 className="cd-panel-title">Matchups</h2>
                  {detail.data.matchups.length === 0 ? (
                    <p className="cd-muted">No matchup data yet.</p>
                  ) : (
                    <table className="cd-matchups">
                      <thead>
                        <tr>
                          <th scope="col">Opponent</th>
                          <th scope="col" className="col-num">Games</th>
                          <th scope="col" className="col-num">Win rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.data.matchups.map((m) => {
                          const opponent = championMap.get(m.opponentChampionId);
                          return (
                            <tr key={m.opponentChampionId}>
                              <td>
                                <Link
                                  className="cd-matchup-link"
                                  to={`/champions/${m.opponentChampionId}${queue ? `?queue=${queue}` : ""}`}
                                >
                                  <img
                                    src={championIconUrl(version, opponent?.id ?? String(m.opponentChampionId))}
                                    alt=""
                                    width={24}
                                    height={24}
                                    loading="lazy"
                                  />
                                  {opponent?.name ?? `Champion ${m.opponentChampionId}`}
                                </Link>
                              </td>
                              <td className="col-num numeric">{m.games}</td>
                              <td className={`col-num numeric ${m.winRate >= 0.5 ? "above" : "below"}`}>
                                {fmtPct(m.winRate)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </section>

                <p className="cd-footnote cd-muted">
                  Averages per game: {fmtNum(detail.data.avgCs)} CS ·{" "}
                  {fmtNum(detail.data.avgDamageDealtToChampions)} damage dealt ·{" "}
                  {fmtNum(detail.data.avgDamageTaken)} taken ·{" "}
                  {detail.data.avgVisionScore.toFixed(1)} vision ·{" "}
                  level {detail.data.avgChampLevel.toFixed(1)}
                </p>
              </>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
