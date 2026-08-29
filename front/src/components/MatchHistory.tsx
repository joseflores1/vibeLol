import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Loading } from "./Loading";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { MatchCard } from "./MatchCard";
import { Tabs, type MatchTab } from "./Tabs";
import { useMatchIds, type RiotRegion } from "../hooks/useApi";
import { apiGet } from "../lib/api";
import { TAB_TO_QUERY } from "../constants/queues";
import type { Champion, MatchDetail, Spell, Rune, Item } from "../types/api";
import "./MatchHistory.css";

interface MatchHistoryProps {
  gameName: string;
  tagLine: string;
  region: RiotRegion;
  puuid: string | undefined;
  version: string;
  championMap: Map<number, Champion>;
  spellMap: Map<number, Spell>;
  runeMap: Map<number, Rune>;
  itemMap: Map<number, Item>;
  activeTab: MatchTab;
  onTabChange: (tab: MatchTab) => void;
  // Cache-scoped champion filter (mastery card → matches on that champion).
  champion?: number;
  championName?: string;
  onClearChampion?: () => void;
}

// Match history column — owns the live wire-up for Phase 3b.
// Flow: Tabs (UI filter) → useMatchIds (Riot ID → matchIds) → useQueries
// (lazy-fetch each match detail) → MatchCard list. Backend caches both
// layers (Account + Match + MatchParticipant) so repeat views are cheap.
export function MatchHistory({
  gameName,
  tagLine,
  region,
  puuid,
  version,
  championMap,
  spellMap,
  runeMap,
  itemMap,
  activeTab,
  onTabChange,
  champion,
  championName,
  onClearChampion,
}: MatchHistoryProps) {
  const query = TAB_TO_QUERY[activeTab];
  const [count, setCount] = useState(10);
  const matchIdsResp = useMatchIds(gameName, tagLine, region, { count, ...query, champion });

  const matchIds = matchIdsResp.data?.matchIds ?? [];

  // Parallel-fetch each match detail. TanStack Query dedupes by matchId,
  // so re-renders are free and tab switches can re-use cached details.
  // The queryFn calls apiGet directly (the matching hook below can't be
  // invoked inside useQueries' queryFn — hooks can't be called inside
  // callbacks). The response shape equals MatchDetail.
  const detailQueries = useQueries({
    queries: matchIds.map((id) => ({
      queryKey: ["match", gameName, tagLine, region, id],
      queryFn: () =>
        apiGet<MatchDetail>(
          `/summoners/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}/matches/${id}`,
          { region },
        ),
      enabled: matchIdsResp.isSuccess && Boolean(puuid) && Boolean(id),
      staleTime: 300_000,
    })),
  });

  // Champion-filter banner — shown in every branch (loading, error, empty,
  // and success) so the filter is always visible + clearable.
  const championNote = champion != null ? (
    <div className="champion-filter-note">
      Matches on <strong>{championName ?? `champion ${champion}`}</strong> — from the
      local cache.{" "}
      {onClearChampion && (
        <button className="champion-filter-clear" onClick={onClearChampion}>
          Clear filter
        </button>
      )}
    </div>
  ) : null;

  if (matchIdsResp.isLoading) return (
    <>
      {championNote}
      <Tabs active={activeTab} onChange={onTabChange} />
      <Loading label="Loading match history" />
    </>
  );

  if (matchIdsResp.isError) return (
    <>
      {championNote}
      <Tabs active={activeTab} onChange={onTabChange} />
      <ErrorState
        title="Couldn't load match history"
        message={(matchIdsResp.error as { message?: string })?.message ?? "Unknown error."}
        status={(matchIdsResp.error as { status?: number })?.status}
        onRetry={() => matchIdsResp.refetch()}
      />
    </>
  );

  if (!matchIdsResp.data || matchIds.length === 0) return (
    <>
      {championNote}
      <Tabs active={activeTab} onChange={onTabChange} />
      <EmptyState
        title={champion != null
          ? `No cached matches on ${championName ?? "this champion"} yet.`
          : activeTab === "all" ? "No matches found." : `No ${labelFor(activeTab)} matches this season.`}
        hint={champion != null
          ? "Un-cached games won't appear until this profile's history has been fetched."
          : "Try a different queue tab, or search for another summoner."}
      />
    </>
  );

  const anyDetailPending = detailQueries.some((q) => q.isLoading);
  const detailError = detailQueries.find((q) => q.isError)?.error as { message?: string; status?: number } | undefined;

  return (
    <>
      {championNote}
      <Tabs active={activeTab} onChange={onTabChange} />
      {anyDetailPending && <Loading label="Loading match details" />}
      {detailError && (
        <ErrorState
          title="Couldn't load some match details"
          message={detailError.message ?? "Unknown error."}
          status={detailError.status}
        />
      )}
      <ul className="match-history">
        {matchIds.map((id, i) => {
          const q = detailQueries[i];
          const match = q?.data;
          if (!match) {
            return (
              <li key={id} className="match-row skeleton">
                <div className="skeleton-bar" aria-hidden />
              </li>
            );
          }
          return (
            <li key={id} className="match-row">
              <Link
                className="match-row-link"
                to={`/summoners/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}/matches/${id}?region=${region}`}
              >
                <MatchCard
                  match={match}
                  puuid={puuid ?? ""}
                  version={version}
                  championMap={championMap}
                  spellMap={spellMap}
                  runeMap={runeMap}
                  itemMap={itemMap}
                />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* More pages likely exist while Riot returns a full page of IDs. */}
      {matchIds.length >= count && (
        <div className="match-history-more">
          <button onClick={() => setCount((c) => c + 10)}>
            Load more (showing {matchIds.length})
          </button>
        </div>
      )}
    </>
  );
}

function labelFor(tab: MatchTab): string {
  switch (tab) {
    case "solo": return "Ranked Solo";
    case "flex": return "Ranked Flex";
    case "normal": return "Normal";
    default: return "";
  }
}