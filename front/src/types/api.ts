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

// Item — mirrors the backend DdragonClient Item. `gold` is the total cost.
export interface Item {
  id: number;
  name: string;
  gold: number;
}

export interface StaticItemsResponse {
  version: string;
  items: Item[];
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

// GET /search/suggest — autocomplete rows from the backend's Account cache.
// profileIconId is null when the account has no cached Summoner row yet.
export interface SummonerSuggestion {
  gameName: string;
  tagLine: string;
  profileIconId: number | null;
}

export interface SearchSuggestResponse {
  suggestions: SummonerSuggestion[];
}

// ── Analytics (Phase 10) — mirrors back/src/services/analytics.service.ts ──

export interface ChampionStatRow {
  championId: number;
  games: number;
  wins: number;
  bans: number;
  // Ratios are 0..1 from the backend; the UI formats as percentages.
  winRate: number;
  pickRate: number;
  banRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgGoldEarned: number;
}

export interface ChampionStatsResult {
  queueId: number | null;
  patch: string | null;
  totalGames: number;
  totalChampions: number;
  start: number;
  count: number;
  champions: ChampionStatRow[];
}

export interface ChampionPositionRow {
  position: string;
  games: number;
  wins: number;
  winRate: number;
}

export interface PopularityRow {
  id: number;
  games: number;
  pickRate: number;
}

export interface MatchupRow {
  opponentChampionId: number;
  games: number;
  wins: number;
  winRate: number;
}

export interface ChampionDetailResult {
  championId: number;
  queueId: number | null;
  patch: string | null;
  games: number;
  wins: number;
  bans: number;
  winRate: number;
  banRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgGoldEarned: number;
  avgCs: number;
  avgDamageDealtToChampions: number;
  avgDamageTaken: number;
  avgVisionScore: number;
  avgChampLevel: number;
  positions: ChampionPositionRow[];
  items: PopularityRow[];
  keystones: PopularityRow[];
  spells: PopularityRow[];
  matchups: MatchupRow[];
}

// ── Match timeline (Phase 10) — mirrors match.service.ts slimTimeline ──

// puuids[i] is the puuid of participantId i+1 (Riot's ordering).
export interface TimelineFrame {
  timestamp: number;
  participantFrames: Record<string, TimelineParticipantFrame>;
}

export interface TimelineParticipantFrame {
  participantId: number;
  level?: number | null;
  currentGold?: number | null;
  totalGold?: number | null;
  goldPerSecond?: number | null;
  jungleMinionsKilled?: number | null;
  laneMinionsKilled?: number | null;
  minionsKilled?: number | null;
  xp?: number | null;
  damageStats?: Record<string, number> | null;
}

export interface TimelineResponse {
  matchId: string;
  puuids: string[];
  frames: TimelineFrame[];
}
