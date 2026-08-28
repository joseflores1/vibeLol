import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  participantGroupBy: vi.fn(),
}));

vi.mock('../lib/client.js', () => ({
  prisma: {
    matchParticipant: { groupBy: mocks.participantGroupBy },
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

describe('analyticsService.findChampionStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService.__resetScopeCacheForTests();
    mocks.participantGroupBy.mockImplementation(async (args: {
      where: { win?: boolean };
    }) => (args.where.win ? winRows : totalsRows));
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
        winRate: 0.75,
        pickRate: 0.8,
        avgKills: 5,
        avgDeaths: 2.5,
        avgAssists: 7.5,
        avgGoldEarned: 10_000,
      },
      {
        championId: 2,
        games: 1,
        wins: 0,
        winRate: 0,
        pickRate: 0.2,
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
