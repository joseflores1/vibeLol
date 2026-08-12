// Response types — mirror the backend's Prisma models + Riot schemas.
// Kept focused: only fields the UI consumes. Server returns more (e.g.,
// updatedAt timestamps), and that's fine — TS structural typing is permissive.

export interface Account {
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string | null;
  updatedAt: string;
}

export interface Summoner {
  puuid: string;
  summonerId: string | null;
  name: string | null;
  summonerLevel: number;
  profileIconId: number;
  revisionDate: string;
  region: string;
  updatedAt: string;
}

// The /summoners/by-riot-id endpoint returns both.
export interface SummonerProfileResponse {
  account: Account;
  summoner: Summoner;
}

export interface LeagueEntry {
  puuid: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export interface LeagueResponse {
  puuid: string;
  entries: LeagueEntry[];
}

export interface ChampionMastery {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: string;
  updatedAt: string;
}

export interface MasteryResponse {
  puuid: string;
  masteries: ChampionMastery[];
}

export interface Champion {
  key: number;
  // Alphabetic ID used for Data Dragon icon URLs (e.g., "Aatrox", "MonkeyKing").
  id: string;
  name: string;
  title: string;
  tags: string[];
}

export interface StaticChampionsResponse {
  version: string;
  champions: Champion[];
}