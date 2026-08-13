import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveAndCacheAccount: vi.fn(),
  getEntriesByPuuid: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('../lib/client.js', () => ({
  prisma: {
    leagueEntry: {
      findMany: mocks.findMany,
      upsert: mocks.upsert,
      deleteMany: mocks.deleteMany,
    },
  },
}));
vi.mock('./summoner.service.js', () => ({ resolveAndCacheAccount: mocks.resolveAndCacheAccount }));
vi.mock('../riot/league.api.js', () => ({ getEntriesByPuuid: mocks.getEntriesByPuuid }));

import { leagueService } from './league.service.js';

describe('leagueService cache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns fresh ranked entries without calling Riot', async () => {
    const account = { puuid: 'puuid-1' };
    const entries = [{
      puuid: 'puuid-1',
      queueType: 'RANKED_SOLO_5x5',
      tier: 'DIAMOND',
      rank: 'I',
      leaguePoints: 80,
      wins: 20,
      losses: 10,
      updatedAt: new Date(),
    }];
    mocks.resolveAndCacheAccount.mockResolvedValue(account);
    mocks.findMany.mockResolvedValue(entries);

    await expect(leagueService.findEntriesByRiotId('na1', 'CacheTest', 'RANK1'))
      .resolves.toEqual({ puuid: 'puuid-1', entries });
    expect(mocks.getEntriesByPuuid).not.toHaveBeenCalled();
  });
});
