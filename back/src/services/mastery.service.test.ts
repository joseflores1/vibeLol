import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveAndCacheAccount: vi.fn(),
  getByPuuid: vi.fn(),
  getByChampion: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('../lib/client.js', () => ({
  prisma: {
    championMastery: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
      deleteMany: mocks.deleteMany,
    },
  },
}));
vi.mock('./summoner.service.js', () => ({ resolveAndCacheAccount: mocks.resolveAndCacheAccount }));
vi.mock('../riot/mastery.api.js', () => ({
  getByPuuid: mocks.getByPuuid,
  getByChampion: mocks.getByChampion,
}));

import { masteryService } from './mastery.service.js';

describe('masteryService cache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns fresh mastery rows without calling Riot', async () => {
    const account = { puuid: 'puuid-1' };
    const masteries = [{
      puuid: 'puuid-1',
      championId: 86,
      championLevel: 7,
      championPoints: 100_000,
      updatedAt: new Date(),
    }];
    mocks.resolveAndCacheAccount.mockResolvedValue(account);
    mocks.findMany.mockResolvedValue(masteries);

    await expect(masteryService.findByRiotId('na1', 'CacheTest', 'MAST1'))
      .resolves.toEqual({ puuid: 'puuid-1', masteries });
    expect(mocks.getByPuuid).not.toHaveBeenCalled();
  });

  it('returns fresh single-champion mastery without calling Riot', async () => {
    const account = { puuid: 'puuid-1' };
    const mastery = {
      puuid: 'puuid-1',
      championId: 86,
      championLevel: 7,
      championPoints: 100_000,
      updatedAt: new Date(),
    };
    mocks.resolveAndCacheAccount.mockResolvedValue(account);
    mocks.findUnique.mockResolvedValue(mastery);

    await expect(masteryService.findByChampion('na1', 'CacheTest', 'MAST1', 86))
      .resolves.toEqual({ puuid: 'puuid-1', mastery });
    expect(mocks.getByChampion).not.toHaveBeenCalled();
  });
});
