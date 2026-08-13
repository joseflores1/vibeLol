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

// Single participant row in a match — mirrors MatchParticipant Prisma model.
export interface MatchParticipant {
  id: string;
  matchId: string;
  puuid: string;
  championId: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  item0: number | null;
  item1: number | null;
  item2: number | null;
  item3: number | null;
  item4: number | null;
  item5: number | null;
  item6: number | null;
  summoner1Id: number;
  summoner2Id: number;
  teamId: number;
  win: boolean;
  visionScore: number | null;
  wardsPlaced: number | null;
  wardsKilled: number | null;
  totalMinionsKilled: number | null;
}

// Full match detail — cached in Postgres on the backend.
export interface MatchDetail {
  matchId: string;
  dataVersion: string | null;
  gameCreation: string;
  gameDuration: number;
  gameStartTimestamp: string;
  gameEndTimestamp: string | null;
  gameMode: string;
  gameType: string;
  gameVersion: string | null;
  mapId: number | null;
  queueId: number | null;
  participants: MatchParticipant[];
}

// GET /summoners/by-riot-id/:g/:t/matches returns { puuid, matchIds }.
// The puuid lets the frontend identify "your row" in each match's
// participant list without an extra round-trip.
export interface MatchIdsResponse {
  puuid: string;
  matchIds: string[];
}