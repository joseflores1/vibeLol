// Data-fetching hooks — TanStack Query wrappers around the apiGet factory.
// Each hook manages its own query key + stale time. The frontend never
// calls Riot directly (AGENTS.md §7); these all hit our REST backend.

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import type {
  SummonerProfileResponse,
  LeagueResponse,
  MasteryResponse,
  StaticChampionsResponse,
  MatchIdsResponse,
  MatchDetail,
  StaticRunesResponse,
  StaticQueuesResponse,
} from "../types/api";

// -- Types ---

export type RiotRegion =
  | "na1" | "br1" | "la1" | "la2" | "oc1"
  | "euw1" | "eun1" | "tr1" | "ru"
  | "kr" | "jp1"
  | "ph2" | "sg2" | "th2" | "tw2" | "vn2";

export const ALL_REGIONS: RiotRegion[] = [
  "na1", "br1", "la1", "la2", "oc1",
  "euw1", "eun1", "tr1", "ru",
  "kr", "jp1",
  "ph2", "sg2", "th2", "tw2", "vn2",
];

// -- Hooks --

export function useSummonerProfile(gameName: string, tagLine: string, region: RiotRegion) {
  return useQuery({
    queryKey: ["summoner", gameName, tagLine, region],
    queryFn: () => apiGet<SummonerProfileResponse>(
      `/summoners/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      { region },
    ),
    enabled: Boolean(gameName && tagLine),
    staleTime: 60_000,
  });
}

export function useLeagueEntries(puuid: string | undefined, region: RiotRegion) {
  // We route via Riot ID through the controller; once we have the puuid,
  // the /league endpoint can be called directly. The hook offers puuid
  // addressing for clarity at the call site.
  return useQuery({
    queryKey: ["league", puuid, region],
    queryFn: () => apiGet<LeagueResponse>(
      `/summoners/by-riot-id/${encodeURIComponent(puuid ?? "")}/league`,
      { region },
    ),
    enabled: Boolean(puuid),
    staleTime: 120_000,
  });
}

// Per AGENTS.md §5a: no puuids in URLs. The /league + /mastery endpoints
// are summoner-scoped at the backend. They use gameName/tagLine in the
// path, so re-feed the warrior's Riot ID here (we already have it on the
// profile page).
export function useLeagueByRiotId(gameName: string, tagLine: string, region: RiotRegion) {
  return useQuery({
    queryKey: ["league", gameName, tagLine, region],
    queryFn: () => apiGet<LeagueResponse>(
      `/summoners/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}/league`,
      { region },
    ),
    enabled: Boolean(gameName && tagLine),
    staleTime: 120_000,
  });
}

export function useMasteryByRiotId(gameName: string, tagLine: string, region: RiotRegion) {
  return useQuery({
    queryKey: ["mastery", gameName, tagLine, region],
    queryFn: () => apiGet<MasteryResponse>(
      `/summoners/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}/mastery`,
      { region },
    ),
    enabled: Boolean(gameName && tagLine),
    staleTime: 300_000,
  });
}

// Static Data Dragon metadata — fetched once for the lifetime of the page.
// Plain fetch keyed on null → returns latest; cached indefinitely because
// champions/items/spells don't change per session.
export function useStaticVersion() {
  return useQuery({
    queryKey: ["static", "version"],
    queryFn: () => apiGet<{ version: string }>("/static/version"),
    staleTime: Infinity,
  });
}

export function useStaticChampions() {
  return useQuery({
    queryKey: ["static", "champions"],
    queryFn: () => apiGet<StaticChampionsResponse>("/static/champions"),
    staleTime: Infinity,
  });
}

export function useStaticRunes() {
  return useQuery({
    queryKey: ["static", "runes"],
    queryFn: () => apiGet<StaticRunesResponse>("/static/runes"),
    staleTime: Infinity,
  });
}

export function useStaticQueues() {
  return useQuery({
    queryKey: ["static", "queues"],
    queryFn: () => apiGet<StaticQueuesResponse>("/static/queues"),
    staleTime: Infinity,
  });
}

// -- Match history (Phase 3b) --

export interface MatchListQueryOpts {
  queue?: number;
  type?: string;
  start?: number;
  count?: number;
}

// Fetches the list of match IDs for a summoner. The `opts` shape mirrors
// the backend's matchListQuerySchema — when a Tab filter is applied, the
// queue/type param changes and TanStack Query refetches under a fresh key.
// Default count=10 keeps Riot dev-key rate limits in check on first load;
// the backend caches each match detail on miss so subsequent views are
// cheap (DB read, no Riot call).
export function useMatchIds(
  gameName: string,
  tagLine: string,
  region: RiotRegion,
  opts: MatchListQueryOpts = {},
) {
  return useQuery({
    queryKey: ["matchIds", gameName, tagLine, region, opts],
    queryFn: () =>
      apiGet<MatchIdsResponse>(
        `/summoners/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}/matches`,
        {
          region,
          start: opts.start,
          count: opts.count,
          queue: opts.queue,
          type: opts.type,
        },
      ),
    enabled: Boolean(gameName && tagLine),
    staleTime: 60_000,
  });
}

// Fetches one match detail (full 10-participant document). Cached by the
// backend on first miss — repeat views are a Postgres read.
export function useMatchDetail(
  gameName: string,
  tagLine: string,
  region: RiotRegion,
  matchId: string,
) {
  return useQuery({
    queryKey: ["match", gameName, tagLine, region, matchId],
    queryFn: () =>
      apiGet<MatchDetail>(
        `/summoners/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}/matches/${matchId}`,
        { region },
      ),
    enabled: Boolean(gameName && tagLine && matchId),
    staleTime: 300_000,
  });
}
