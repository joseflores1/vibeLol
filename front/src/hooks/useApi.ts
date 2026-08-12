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