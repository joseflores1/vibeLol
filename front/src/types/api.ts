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

export interface Rune {
  id: number;
  key: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  icon: string;
  styleId: number;
  styleKey: string;
  styleName: string;
}

export interface StaticRunesResponse {
  version: string;
  runes: Rune[];
}

// Summoner spell — mirrors the backend DdragonClient Spell. `key` is the
// numeric cast ID sent by Match v5 (summoner1Id/summoner2Id); `id` is the
// alphabetic Data Dragon asset name (e.g. "SummonerFlash").
export interface Spell {
  key: number;
  name: string;
  id: string;
}

export interface StaticSpellsResponse {
  version: string;
  spells: Spell[];
}

export interface QueueDefinition {
  id: number;
  key: string;
  name: string;
  gameMode: string;
  custom: boolean;
  analyticsEligible: boolean;
}

export interface StaticQueuesResponse {
  queues: QueueDefinition[];
}

// Single participant row in a match — mirrors MatchParticipant Prisma model.
export interface MatchParticipant {
  id: string;
  matchId: string;
  puuid: string;
  championId: number;
  championName: string;
  riotIdGameName: string | null;
  riotIdTagline: string | null;
  profileIcon: number | null;
  individualPosition: string | null;
  teamPosition: string | null;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  goldSpent: number | null;
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
  neutralMinionsKilled: number | null;
  champLevel: number | null;
  totalDamageDealtToChampions: number | null;
  totalDamageTaken: number | null;
  damageDealtToObjectives: number | null;
  damageSelfMitigated: number | null;
  totalHeal: number | null;
  totalTimeCCingOthers: number | null;
  doubleKills: number | null;
  tripleKills: number | null;
  quadraKills: number | null;
  pentaKills: number | null;
  largestKillingSpree: number | null;
  largestMultiKill: number | null;
  towerKills: number | null;
  inhibitorKills: number | null;
  baronKills: number | null;
  dragonKills: number | null;
  firstBloodKill: boolean | null;
  perks: MatchPerks | null;
}

export interface MatchPerkSelection {
  perk: number;
  var1: number;
  var2: number;
  var3: number;
}

export interface MatchPerkStyle {
  description: string;
  style: number;
  selections: MatchPerkSelection[];
}

export interface MatchPerks {
  styles: MatchPerkStyle[];
  statPerks: {
    defense: number;
    flex: number;
    offense: number;
  };
}

export interface MatchTeam {
  teamId: number;
  win: boolean;
  totalGoldEarned: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalVisionScore: number;
  totalWardsPlaced: number;
  totalWardsKilled: number;
  totalMinionsKilled: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  damageDealtToObjectives: number;
  towerKills: number;
  inhibitorKills: number;
  baronKills: number;
  dragonKills: number;
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
  isCustom: boolean;
  participants: MatchParticipant[];
  teams: MatchTeam[];
}

// GET /summoners/by-riot-id/:g/:t/matches returns { puuid, matchIds }.
// The puuid lets the frontend identify "your row" in each match's
// participant list without an extra round-trip.
export interface MatchIdsResponse {
  puuid: string;
  matchIds: string[];
}
