import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  participantGroupBy: vi.fn(),
  participantFindMany: vi.fn(),
  banGroupBy: vi.fn(),
}));

vi.mock('../lib/client.js', () => ({
  prisma: {
    matchParticipant: {
      groupBy: mocks.participantGroupBy,
      findMany: mocks.participantFindMany,
    },
    matchBan: { groupBy: mocks.banGroupBy },
  },
}));

import { analyticsService } from './analytics.service.js';
import { ANALYTICS_ELIGIBLE_QUEUE_IDS } from '../constants/queues.js';

// Two-champion fixture: champ 1 played 4 games (3 wins), champ 2 played 1.
const totalsRows = [
  {
    championId: 1,
    _count: { _all: 4 },
    _sum: { kills: 20, deaths: 10, assists: 30, goldEarned: 40_000 },
  },
  {
    championId: 2,
    _count: { _all: 1 },
    _sum: { kills: 2, deaths: 5, assists: 1, goldEarned: 9_000 },
  },
];
const winRows = [{ championId: 1, _count: { _all: 3 } }];
const banRows = [{ championId: 1, _count: { _all: 1 } }];

describe('analyticsService.findChampionStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService.__resetScopeCacheForTests();
    mocks.participantGroupBy.mockImplementation(async (args: {
      where: { win?: boolean };
    }) => (args.where.win ? winRows : totalsRows));
    mocks.banGroupBy.mockResolvedValue(banRows);
    mocks.participantFindMany.mockResolvedValue([]);
  });

  it('computes winRate, pickRate, and per-game averages, sorted by games desc', async () => {
    const result = await analyticsService.findChampionStats({ start: 0, count: 20 });

    expect(result.totalGames).toBe(5);
    expect(result.totalChampions).toBe(2);
    expect(result.queueId).toBeNull();
    expect(result.patch).toBeNull();
    expect(result.champions).toEqual([
      {
        championId: 1,
        games: 4,
        wins: 3,
        bans: 1,
        winRate: 0.75,
        pickRate: 0.8,
        banRate: 0.2,
        avgKills: 5,
        avgDeaths: 2.5,
        avgAssists: 7.5,
        avgGoldEarned: 10_000,
      },
      {
        championId: 2,
        games: 1,
        wins: 0,
        bans: 0,
        winRate: 0,
        pickRate: 0.2,
        banRate: 0,
        avgKills: 2,
        avgDeaths: 5,
        avgAssists: 1,
        avgGoldEarned: 9_000,
      },
    ]);
  });

  it('defaults the scope to all analytics-eligible queues and excludes customs', async () => {
    await analyticsService.findChampionStats({ start: 0, count: 20 });

    const where = mocks.participantGroupBy.mock.calls[0]![0].where as {
      match: { queueId: unknown; isCustom: boolean };
    };
    expect(where.match.isCustom).toBe(false);
    expect(where.match.queueId).toEqual({ in: ANALYTICS_ELIGIBLE_QUEUE_IDS });
  });

  it('narrows the scope when a queue and patch are given', async () => {
    await analyticsService.findChampionStats({ queue: 420, patch: '15.16.1', start: 0, count: 20 });

    const where = mocks.participantGroupBy.mock.calls[0]![0].where as {
      match: { queueId: unknown; gameVersion?: string; isCustom: boolean };
    };
    expect(where.match.queueId).toBe(420);
    expect(where.match.gameVersion).toBe('15.16.1');
    expect(where.match.isCustom).toBe(false);
  });

  it('filters the wins query on win:true', async () => {
    await analyticsService.findChampionStats({ start: 0, count: 20 });

    const winWhere = mocks.participantGroupBy.mock.calls[1]![0].where as {
      win?: boolean;
    };
    expect(winWhere.win).toBe(true);
  });

  it('caches a computed scope across identical queries', async () => {
    await analyticsService.findChampionStats({ queue: 440, start: 0, count: 20 });
    expect(mocks.participantGroupBy).toHaveBeenCalledTimes(2);

    await analyticsService.findChampionStats({ queue: 440, start: 0, count: 20 });
    expect(mocks.participantGroupBy).toHaveBeenCalledTimes(2);
  });

  it('paginates the champion rows in memory', async () => {
    const page = await analyticsService.findChampionStats({ queue: 430, start: 1, count: 1 });

    expect(page.start).toBe(1);
    expect(page.count).toBe(1);
    expect(page.totalChampions).toBe(2);
    expect(page.champions).toHaveLength(1);
    expect(page.champions[0]!.championId).toBe(2);
  });

  it('tolerates an empty dataset without dividing by zero', async () => {
    mocks.participantGroupBy.mockResolvedValue([]);

    const result = await analyticsService.findChampionStats({ queue: 490, start: 0, count: 20 });

    expect(result.totalGames).toBe(0);
    expect(result.totalChampions).toBe(0);
    expect(result.champions).toEqual([]);
  });
});

// ── findChampionDetail (Phase 8a) ──

// Champion 7: 3 games in totals (2 wins), all TOP except one JUNGLE.
const detailTotals = [{
  championId: 7,
  _count: { _all: 3 },
  _sum: {
    kills: 15, deaths: 6, assists: 12, goldEarned: 36_000,
    totalMinionsKilled: 600, neutralMinionsKilled: 60,
    totalDamageDealtToChampions: 60_000, totalDamageTaken: 45_000,
    visionScore: 45, champLevel: 51,
  },
}];
const detailWins = [{ championId: 7, _count: { _all: 2 } }];
const detailBans = [{ championId: 7, _count: { _all: 1 } }];
const positionRows = [
  { teamPosition: 'TOP', _count: { _all: 2 } },
  { teamPosition: 'JUNGLE', _count: { _all: 1 } },
  { teamPosition: null, _count: { _all: 0 } },
];
const positionWinRows = [
  { teamPosition: 'TOP', _count: { _all: 1 } },
  { teamPosition: null, _count: { _all: 0 } },
];

// Two sampled matches: champ 7 wins both. Match A has opponents 8+9
// (both lose), Match B has opponent 8 (wins).
const champDetailRows = [
  {
    matchId: 'NA1_A', teamId: 100, win: true,
    item0: 3071, item1: 3047, item2: null, item3: null, item4: null, item5: null,
    summoner1Id: 4, summoner2Id: 14,
    perks: { styles: [{ description: 'primaryStyle', style: 8100, selections: [{ perk: 8112, var1: 1, var2: 0, var3: 0 }] }], statPerks: { defense: 5001, flex: 5008, offense: 5005 } },
  },
  {
    matchId: 'NA1_B', teamId: 200, win: true,
    item0: 3071, item1: 6333, item2: null, item3: null, item4: null, item5: null,
    summoner1Id: 4, summoner2Id: 12,
    perks: { styles: [{ description: 'subStyle', style: 8200, selections: [{ perk: 8230, var1: 1, var2: 0, var3: 0 }] }], statPerks: { defense: 5001, flex: 5008, offense: 5005 } },
  },
];
const opponentDetailRows = [
  { matchId: 'NA1_A', teamId: 200, championId: 8, win: false },
  { matchId: 'NA1_A', teamId: 200, championId: 9, win: false },
  { matchId: 'NA1_B', teamId: 100, championId: 8, win: true },
];

describe('analyticsService.findChampionDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService.__resetScopeCacheForTests();
    mocks.participantGroupBy.mockImplementation(async (args: {
      by: string[];
      where: { win?: boolean; championId?: number };
    }) => {
      // Champion 999 has no cached games — every aggregate is empty.
      if (args.where.championId === 999) return [];
      if (args.by[0] === 'teamPosition') {
        return args.where.win ? positionWinRows : positionRows;
      }
      return args.where.win ? detailWins : detailTotals;
    });
    mocks.banGroupBy.mockImplementation(async (args: {
      where: { championId?: number };
    }) => (args.where.championId === 999 ? [] : detailBans));
    mocks.participantFindMany.mockResolvedValue([]);
  });

  it('computes extended averages, positions, and win rate', async () => {
    const detail = await analyticsService.findChampionDetail(7, {});

    expect(detail.championId).toBe(7);
    expect(detail.games).toBe(3);
    expect(detail.wins).toBe(2);
    expect(detail.bans).toBe(1);
    expect(detail.winRate).toBeCloseTo(0.6667, 4);
    expect(detail.banRate).toBeCloseTo(0.3333, 4);
    expect(detail.avgKills).toBe(5);
    expect(detail.avgDeaths).toBe(2);
    expect(detail.avgAssists).toBe(4);
    expect(detail.avgGoldEarned).toBe(12_000);
    expect(detail.avgCs).toBeCloseTo(220, 2);
    expect(detail.avgDamageDealtToChampions).toBe(20_000);
    expect(detail.avgDamageTaken).toBe(15_000);
    expect(detail.avgVisionScore).toBe(15);
    expect(detail.avgChampLevel).toBe(17);
    expect(detail.positions).toEqual([
      { position: 'TOP', games: 2, wins: 1, winRate: 0.5 },
      { position: 'JUNGLE', games: 1, wins: 0, winRate: 0 },
      { position: 'UNKNOWN', games: 0, wins: 0, winRate: 0 },
    ]);
  });

  it('maps a null teamPosition to UNKNOWN', async () => {
    const detail = await analyticsService.findChampionDetail(7, {});
    const unknown = detail.positions.find((p) => p.position === 'UNKNOWN');
    expect(unknown).toEqual({ position: 'UNKNOWN', games: 0, wins: 0, winRate: 0 });
  });

  it('tallies items (no trinket), keystones, and spells over sampled rows', async () => {
    mocks.participantFindMany
      .mockResolvedValueOnce(champDetailRows)
      .mockResolvedValueOnce(opponentDetailRows);

    const detail = await analyticsService.findChampionDetail(7, {});

    expect(detail.items[0]).toEqual({ id: 3071, games: 2, pickRate: 1 });
    expect(detail.items.find((i) => i.id === 6333)?.games).toBe(1);
    expect(detail.items.find((i) => i.id === 3340)).toBeUndefined();
    expect(detail.keystones).toEqual([{ id: 8112, games: 1, pickRate: 0.5 }]);
    expect(detail.spells[0]).toEqual({ id: 4, games: 2, pickRate: 1 });
  });

  it('counts matchups from opponents on the other team, inverted wins', async () => {
    mocks.participantFindMany
      .mockResolvedValueOnce(champDetailRows)
      .mockResolvedValueOnce(opponentDetailRows);

    const detail = await analyticsService.findChampionDetail(7, {});

    expect(detail.matchups).toEqual([
      { opponentChampionId: 8, games: 2, wins: 1, winRate: 0.5 },
      { opponentChampionId: 9, games: 1, wins: 1, winRate: 1 },
    ]);
  });

  it('caps the sampled window at DETAIL_ROW_LIMIT rows', async () => {
    mocks.participantFindMany
      .mockResolvedValueOnce(champDetailRows)
      .mockResolvedValueOnce(opponentDetailRows);

    await analyticsService.findChampionDetail(7, {});

    expect(mocks.participantFindMany.mock.calls[0]![0].take).toBe(1000);
  });

  it('returns zeros and empty arrays for a champion with no cached games', async () => {
    const detail = await analyticsService.findChampionDetail(999, {});

    expect(detail.games).toBe(0);
    expect(detail.winRate).toBe(0);
    expect(detail.bans).toBe(0);
    expect(detail.banRate).toBe(0);
    expect(detail.positions).toEqual([]);
    expect(detail.items).toEqual([]);
    expect(detail.keystones).toEqual([]);
    expect(detail.spells).toEqual([]);
    expect(detail.matchups).toEqual([]);
    expect(mocks.participantFindMany).not.toHaveBeenCalled();
  });

  it('caches a computed detail across identical queries', async () => {
    await analyticsService.findChampionDetail(7, {});
    const callsAfterFirst = mocks.participantGroupBy.mock.calls.length;

    await analyticsService.findChampionDetail(7, {});

    expect(mocks.participantGroupBy.mock.calls.length).toBe(callsAfterFirst);
  });
});
