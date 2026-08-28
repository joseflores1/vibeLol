import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock Prisma so analytics route tests exercise the HTTP layer without a
// live database. groupBy resolves based on the where clause (wins query
// filters on win:true).
vi.mock('../src/lib/client.js', () => {
  const totalsRows = [
    {
      championId: 266,
      _count: { _all: 10 },
      _sum: { kills: 55, deaths: 40, assists: 60, goldEarned: 120_000 },
    },
    {
      championId: 157,
      _count: { _all: 5 },
      _sum: { kills: 30, deaths: 15, assists: 25, goldEarned: 65_000 },
    },
  ];
  const winRows = [{ championId: 266, _count: { _all: 6 } }];
  return {
    prisma: {
      matchParticipant: {
        groupBy: vi.fn(async (args: { by: string[]; where: { win?: boolean } }) => {
          if (args.by[0] === 'teamPosition') return [];
          return args.where.win ? winRows : totalsRows;
        }),
        findMany: vi.fn(async () => []),
      },
    },
  };
});

const { app } = await import('../src/app.js');

// Route tests for GET /api/v1/analytics/champions.
describe('GET /api/v1/analytics/champions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with aggregated champion stats', async () => {
    const res = await request(app).get('/api/v1/analytics/champions?queue=420');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      queueId: 420,
      patch: null,
      totalGames: 15,
      totalChampions: 2,
      start: 0,
      count: 20,
    });
    expect(res.body.data.champions[0]).toEqual({
      championId: 266,
      games: 10,
      wins: 6,
      winRate: 0.6,
      pickRate: 0.6667,
      avgKills: 5.5,
      avgDeaths: 4,
      avgAssists: 6,
      avgGoldEarned: 12_000,
    });
  });

  it('returns 400 for a non-analytics-eligible queue (ARAM)', async () => {
    const res = await request(app).get('/api/v1/analytics/champions?queue=450');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body.errors)).toContain('analytics-eligible');
  });

  it('returns 400 when count exceeds the maximum', async () => {
    const res = await request(app).get('/api/v1/analytics/champions?count=200');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('passes the patch filter through to the query', async () => {
    const { prisma } = await import('../src/lib/client.js');
    await request(app).get('/api/v1/analytics/champions?queue=440&patch=15.16.1');

    const where = (prisma.matchParticipant.groupBy as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].where as { match: { gameVersion?: string } };
    expect(where.match.gameVersion).toBe('15.16.1');
  });
});

describe('GET /api/v1/analytics/champions/:championId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with the drilldown payload', async () => {
    const res = await request(app).get('/api/v1/analytics/champions/266?queue=420');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      championId: 266,
      queueId: 420,
      games: 10,
      wins: 6,
      winRate: 0.6,
      avgKills: 5.5,
      positions: [],
      items: [],
      keystones: [],
      spells: [],
      matchups: [],
    });
  });

  it('returns 400 for a non-numeric champion id', async () => {
    const res = await request(app).get('/api/v1/analytics/champions/abc');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for a non-analytics-eligible queue on the drilldown', async () => {
    const res = await request(app).get('/api/v1/analytics/champions/266?queue=450');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
