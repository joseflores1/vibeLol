import { prisma } from '../lib/client.js';
import { ANALYTICS_ELIGIBLE_QUEUE_IDS } from '../constants/queues.js';
import { isStale, TTL } from '../lib/staleness.js';
import type { AnalyticsQuery, AnalyticsScopeQuery } from '../validators/analytics.validator.js';

// ── Champion win-rate analytics (Phase 7) ──
//
// On-the-fly aggregation over cached match_participants joined to matches.
// Chosen over a materialized rollup while the dataset grows slowly under
// dev-key rate limits (see Phase 7 plan): one groupBy per request, at most
// ~160 champion rows, plus a short in-process response cache. If this ever
// becomes the hot path, promote to a ChampionStats rollup incremented in
// matchService.findMatchById.

export interface ChampionStatRow {
  championId: number;
  games: number;
  wins: number;
  bans: number;
  // Ratios are 0..1 (frontend formats as %). Rounded to 4 decimals to keep
  // the JSON tidy; never re-round before deriving.
  winRate: number;
  pickRate: number;
  banRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgGoldEarned: number;
}

export interface ChampionStatsResult {
  // The resolved scope: queueId null means "all eligible queues".
  queueId: number | null;
  patch: string | null;
  // Total participant-games across ALL champions in scope (not just the
  // requested page) — pickRate denominator and the frontend's low-sample
  // graying both need it.
  totalGames: number;
  totalChampions: number;
  start: number;
  count: number;
  champions: ChampionStatRow[];
}

// Prisma groupBy can't aggregate the win boolean directly, so wins come
// from a second groupBy filtered win:true, merged here.
interface TotalsRow {
  championId: number;
  games: number;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
}
interface ComputedScope {
  fetchedAt: Date;
  totalGames: number;
  rows: ChampionStatRow[];
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Aggregation scope: only analytics-eligible, never custom (Riot ToS),
// optionally narrowed to one queue / one patch.
function buildWhere(queueId: number | null, patch: string | null) {
  return {
    match: {
      isCustom: false,
      queueId: queueId ?? { in: ANALYTICS_ELIGIBLE_QUEUE_IDS },
      ...(patch ? { gameVersion: patch } : {}),
    },
  };
}

async function computeAll(queueId: number | null, patch: string | null): Promise<ComputedScope> {
  const where = buildWhere(queueId, patch);
  const [totals, winRows, banRows] = await Promise.all([
    prisma.matchParticipant.groupBy({
      by: ['championId'],
      where,
      _count: { _all: true },
      _sum: { kills: true, deaths: true, assists: true, goldEarned: true },
    }),
    prisma.matchParticipant.groupBy({
      by: ['championId'],
      where: { ...where, win: true },
      _count: { _all: true },
    }),
    prisma.matchBan.groupBy({
      by: ['championId'],
      where,
      _count: { _all: true },
    }),
  ]);

  const winsById = new Map(winRows.map((row) => [row.championId, row._count._all]));
  const bansById = new Map(banRows.map((row) => [row.championId, row._count._all]));
  const totalGames = totals.reduce((sum, row) => sum + row._count._all, 0);

  const rows: ChampionStatRow[] = totals
    .map((row): TotalsRow & { wins: number; bans: number } => {
      const games = row._count._all;
      return {
        championId: row.championId,
        games,
        wins: winsById.get(row.championId) ?? 0,
        bans: bansById.get(row.championId) ?? 0,
        kills: row._sum.kills ?? 0,
        deaths: row._sum.deaths ?? 0,
        assists: row._sum.assists ?? 0,
        goldEarned: row._sum.goldEarned ?? 0,
      };
    })
    .sort((a, b) => b.games - a.games || a.championId - b.championId)
    .map((row): ChampionStatRow => {
      const { championId, games, wins, bans, kills, deaths, assists, goldEarned } = row;
      return {
        championId,
        games,
        wins,
        bans,
        winRate: round(games > 0 ? wins / games : 0, 4),
        pickRate: round(totalGames > 0 ? games / totalGames : 0, 4),
        banRate: round(totalGames > 0 ? bans / totalGames : 0, 4),
        avgKills: round(games > 0 ? kills / games : 0, 2),
        avgDeaths: round(games > 0 ? deaths / games : 0, 2),
        avgAssists: round(games > 0 ? assists / games : 0, 2),
        avgGoldEarned: round(games > 0 ? goldEarned / games : 0, 2),
      };
    });

  return { fetchedAt: new Date(), totalGames, rows };
}

// ── Champion drilldown (Phase 8a) ──

export interface ChampionPositionRow {
  // teamPosition (TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY); null → "UNKNOWN"
  // (ARAM rows and pre-2021 matches).
  position: string;
  games: number;
  wins: number;
  winRate: number;
}

export interface PopularityRow {
  id: number;
  games: number;
  // count / sampledGames — the denominator is the number of sampled rows
  // (capped below), so rates stay honest under the cap.
  pickRate: number;
}

export interface MatchupRow {
  opponentChampionId: number;
  games: number;
  // Wins BY the drilled-down champion (not by the opponent).
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
  // item0–item5 tallies (trinket item6 excluded — it's a free ward).
  items: PopularityRow[];
  keystones: PopularityRow[];
  spells: PopularityRow[];
  matchups: MatchupRow[];
}

// One window serves the whole drilldown: the most recent N cached rows for
// the champion bound both the popularity tallies and the matchup pool.
const DETAIL_ROW_LIMIT = 1000;

// Extracts the keystone rune id from a Prisma Json perks column. Mirrors
// the frontend's lib/match.ts logic; runtime-checked because the column is
// untyped Json. Strict: only rows explicitly labeled primaryStyle count,
// so malformed perks never corrupt the keystone tally.
function keystoneFromPerks(perks: unknown): number | null {
  if (perks == null || typeof perks !== 'object') return null;
  const styles = (perks as { styles?: unknown }).styles;
  if (!Array.isArray(styles) || styles.length === 0) return null;
  const primary = styles.find(
    (s) => (s as { description?: unknown }).description === 'primaryStyle',
  );
  if (!primary) return null;
  const selections = (primary as { selections?: unknown }).selections;
  if (!Array.isArray(selections) || selections.length === 0) return null;
  const perk = (selections[0] as { perk?: unknown })?.perk;
  return typeof perk === 'number' ? perk : null;
}

// Generic tally: counts ids into sorted PopularityRows.
function tally(ids: Array<number | null | undefined>, sampledGames: number): PopularityRow[] {
  const counts = new Map<number, number>();
  for (const id of ids) {
    if (id == null) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([id, games]) => ({
      id,
      games,
      pickRate: round(sampledGames > 0 ? games / sampledGames : 0, 4),
    }))
    .sort((a, b) => b.games - a.games || a.id - b.id);
}

const POSITION_LABELS: Record<string, string> = {
  TOP: 'TOP',
  JUNGLE: 'JUNGLE',
  MIDDLE: 'MIDDLE',
  BOTTOM: 'BOTTOM',
  UTILITY: 'UTILITY',
};

async function computeChampionDetail(
  championId: number,
  queueId: number | null,
  patch: string | null,
): Promise<ChampionDetailResult> {
  const baseWhere = buildWhere(queueId, patch);
  const where = { ...baseWhere, championId };

  const [totalsRows, winRows, positionRows, positionWinRows, banRows] = await Promise.all([
    prisma.matchParticipant.groupBy({
      by: ['championId'],
      where,
      _count: { _all: true },
      _sum: {
        kills: true,
        deaths: true,
        assists: true,
        goldEarned: true,
        totalMinionsKilled: true,
        neutralMinionsKilled: true,
        totalDamageDealtToChampions: true,
        totalDamageTaken: true,
        visionScore: true,
        champLevel: true,
      },
    }),
    prisma.matchParticipant.groupBy({
      by: ['championId'],
      where: { ...where, win: true },
      _count: { _all: true },
    }),
    prisma.matchParticipant.groupBy({
      by: ['teamPosition'],
      where,
      _count: { _all: true },
    }),
    prisma.matchParticipant.groupBy({
      by: ['teamPosition'],
      where: { ...where, win: true },
      _count: { _all: true },
    }),
    prisma.matchBan.groupBy({
      by: ['championId'],
      where,
      _count: { _all: true },
    }),
  ]);

  const totals = totalsRows[0];
  const games = totals?._count._all ?? 0;
  const wins = winRows[0]?._count._all ?? 0;
  const bans = banRows[0]?._count._all ?? 0;
  const sum = totals?._sum;
  const winsByPosition = new Map(
    positionWinRows.map((row) => [row.teamPosition, row._count._all]),
  );

  const positions: ChampionPositionRow[] = positionRows
    .map((row) => {
      const positionGames = row._count._all;
      const positionWins = winsByPosition.get(row.teamPosition) ?? 0;
      return {
        position: row.teamPosition != null
          ? POSITION_LABELS[row.teamPosition] ?? row.teamPosition
          : 'UNKNOWN',
        games: positionGames,
        wins: positionWins,
        winRate: round(positionGames > 0 ? positionWins / positionGames : 0, 4),
      };
    })
    .sort((a, b) => b.games - a.games || a.position.localeCompare(b.position));

  // Popularity + matchup window: most recent rows for this champion.
  const champRows = games > 0
    ? await prisma.matchParticipant.findMany({
      where,
      orderBy: { match: { gameCreation: 'desc' } },
      take: DETAIL_ROW_LIMIT,
      select: {
        matchId: true,
        teamId: true,
        win: true,
        item0: true,
        item1: true,
        item2: true,
        item3: true,
        item4: true,
        item5: true,
        summoner1Id: true,
        summoner2Id: true,
        perks: true,
      },
    })
    : [];

  const sampledGames = champRows.length;
  const items = tally(
    champRows.flatMap((row) => [row.item0, row.item1, row.item2, row.item3, row.item4, row.item5]),
    sampledGames,
  );
  const keystones = tally(
    champRows.map((row) => keystoneFromPerks(row.perks)),
    sampledGames,
  );
  const spells = tally(
    champRows.flatMap((row) => [row.summoner1Id, row.summoner2Id]),
    sampledGames,
  );

  // Matchups: opponents = participants of the sampled matches on the other
  // team. The opponent's own win flag inverted is the champion's win.
  const champTeamByMatch = new Map(champRows.map((row) => [row.matchId, row.teamId]));
  const matchupsById = new Map<number, { games: number; wins: number }>();
  if (champRows.length > 0) {
    const opponentRows = await prisma.matchParticipant.findMany({
      where: { matchId: { in: champRows.map((row) => row.matchId) } },
      select: { matchId: true, teamId: true, championId: true, win: true },
    });
    for (const row of opponentRows) {
      const champTeam = champTeamByMatch.get(row.matchId);
      if (champTeam === undefined || row.teamId === champTeam || row.championId === championId) {
        continue;
      }
      const current = matchupsById.get(row.championId) ?? { games: 0, wins: 0 };
      current.games += 1;
      if (!row.win) current.wins += 1;
      matchupsById.set(row.championId, current);
    }
  }
  const matchups: MatchupRow[] = Array.from(matchupsById.entries())
    .map(([opponentChampionId, m]) => ({
      opponentChampionId,
      games: m.games,
      wins: m.wins,
      winRate: round(m.games > 0 ? m.wins / m.games : 0, 4),
    }))
    .sort((a, b) => b.games - a.games || a.opponentChampionId - b.opponentChampionId);

  return {
    championId,
    queueId,
    patch,
    games,
    wins,
    bans,
    winRate: round(games > 0 ? wins / games : 0, 4),
    banRate: round(games > 0 ? bans / games : 0, 4),
    avgKills: round(games > 0 ? (sum?.kills ?? 0) / games : 0, 2),
    avgDeaths: round(games > 0 ? (sum?.deaths ?? 0) / games : 0, 2),
    avgAssists: round(games > 0 ? (sum?.assists ?? 0) / games : 0, 2),
    avgGoldEarned: round(games > 0 ? (sum?.goldEarned ?? 0) / games : 0, 2),
    avgCs: round(games > 0
      ? ((sum?.totalMinionsKilled ?? 0) + (sum?.neutralMinionsKilled ?? 0)) / games
      : 0, 2),
    avgDamageDealtToChampions: round(games > 0 ? (sum?.totalDamageDealtToChampions ?? 0) / games : 0, 2),
    avgDamageTaken: round(games > 0 ? (sum?.totalDamageTaken ?? 0) / games : 0, 2),
    avgVisionScore: round(games > 0 ? (sum?.visionScore ?? 0) / games : 0, 2),
    avgChampLevel: round(games > 0 ? (sum?.champLevel ?? 0) / games : 0, 2),
    positions,
    items,
    keystones,
    spells,
    matchups,
  };
}

// Bounded in-process cache over the pre-pagination scope. Full rows are
// cached so ?start/?count variations share one computation.
const scopeCache = new Map<string, ComputedScope>();
const detailCache = new Map<string, { fetchedAt: Date; detail: ChampionDetailResult }>();
const MAX_SCOPE_CACHE_ENTRIES = 200;

function cacheKey(queueId: number | null, patch: string | null): string {
  return JSON.stringify([queueId, patch]);
}

export const analyticsService = {
  // Test hook — the module-level scope cache would otherwise leak between
  // tests that query the same scope.
  __resetScopeCacheForTests(): void {
    scopeCache.clear();
    detailCache.clear();
  },

  // Aggregated champion stats for the analytics surface. Sorted by games
  // desc (most-played first), paginated in memory after the cache lookup.
  async findChampionStats(query: AnalyticsQuery): Promise<ChampionStatsResult> {
    const queueId = query.queue ?? null;
    const patch = query.patch ?? null;
    const key = cacheKey(queueId, patch);

    let scope = scopeCache.get(key);
    if (!scope || isStale(scope.fetchedAt, TTL.analytics)) {
      scope = await computeAll(queueId, patch);
      scopeCache.delete(key);
      scopeCache.set(key, scope);
      if (scopeCache.size > MAX_SCOPE_CACHE_ENTRIES) {
        const oldest = scopeCache.keys().next().value;
        if (oldest) scopeCache.delete(oldest);
      }
    }

    return {
      queueId,
      patch,
      totalGames: scope.totalGames,
      totalChampions: scope.rows.length,
      start: query.start,
      count: query.count,
      champions: scope.rows.slice(query.start, query.start + query.count),
    };
  },

  // Per-champion drilldown: extended averages, position breakdown, item/
  // keystone/spell popularity, and matchup counters over the champion's
  // most recent cached rows. Zeros (not 404) when the champion has no
  // cached games in scope — the champion itself still exists.
  async findChampionDetail(
    championId: number,
    query: AnalyticsScopeQuery,
  ): Promise<ChampionDetailResult> {
    const queueId = query.queue ?? null;
    const patch = query.patch ?? null;
    const key = JSON.stringify(['detail', championId, queueId, patch]);

    const cached = detailCache.get(key);
    if (cached && !isStale(cached.fetchedAt, TTL.analytics)) return cached.detail;

    const detail = await computeChampionDetail(championId, queueId, patch);
    detailCache.delete(key);
    detailCache.set(key, { fetchedAt: new Date(), detail });
    if (detailCache.size > MAX_SCOPE_CACHE_ENTRIES) {
      const oldest = detailCache.keys().next().value;
      if (oldest) detailCache.delete(oldest);
    }
    return detail;
  },
};
