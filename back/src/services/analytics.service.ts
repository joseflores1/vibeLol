import { prisma } from '../lib/client.js';
import { ANALYTICS_ELIGIBLE_QUEUE_IDS } from '../constants/queues.js';
import { isStale, TTL } from '../lib/staleness.js';
import type { AnalyticsQuery } from '../validators/analytics.validator.js';

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
  // Ratios are 0..1 (frontend formats as %). Rounded to 4 decimals to keep
  // the JSON tidy; never re-round before deriving.
  winRate: number;
  pickRate: number;
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
  const [totals, winRows] = await Promise.all([
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
  ]);

  const winsById = new Map(winRows.map((row) => [row.championId, row._count._all]));
  const totalGames = totals.reduce((sum, row) => sum + row._count._all, 0);

  const rows: ChampionStatRow[] = totals
    .map((row): TotalsRow & { wins: number } => {
      const games = row._count._all;
      return {
        championId: row.championId,
        games,
        wins: winsById.get(row.championId) ?? 0,
        kills: row._sum.kills ?? 0,
        deaths: row._sum.deaths ?? 0,
        assists: row._sum.assists ?? 0,
        goldEarned: row._sum.goldEarned ?? 0,
      };
    })
    .sort((a, b) => b.games - a.games || a.championId - b.championId)
    .map((row): ChampionStatRow => {
      const { championId, games, wins, kills, deaths, assists, goldEarned } = row;
      return {
        championId,
        games,
        wins,
        winRate: round(games > 0 ? wins / games : 0, 4),
        pickRate: round(totalGames > 0 ? games / totalGames : 0, 4),
        avgKills: round(games > 0 ? kills / games : 0, 2),
        avgDeaths: round(games > 0 ? deaths / games : 0, 2),
        avgAssists: round(games > 0 ? assists / games : 0, 2),
        avgGoldEarned: round(games > 0 ? goldEarned / games : 0, 2),
      };
    });

  return { fetchedAt: new Date(), totalGames, rows };
}

// Bounded in-process cache over the pre-pagination scope. Full rows are
// cached so ?start/?count variations share one computation.
const scopeCache = new Map<string, ComputedScope>();
const MAX_SCOPE_CACHE_ENTRIES = 200;

function cacheKey(queueId: number | null, patch: string | null): string {
  return JSON.stringify([queueId, patch]);
}

export const analyticsService = {
  // Test hook — the module-level scope cache would otherwise leak between
  // tests that query the same scope.
  __resetScopeCacheForTests(): void {
    scopeCache.clear();
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
};
