import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveAndCacheAccount: vi.fn(),
  getMatchIdsByPuuid: vi.fn(),
  getMatch: vi.fn(),
  matchFindUnique: vi.fn(),
}));

vi.mock('../lib/client.js', () => ({
  prisma: { match: { findUnique: mocks.matchFindUnique } },
}));
vi.mock('./summoner.service.js', () => ({
  clusterFromRegion: vi.fn(() => 'americas'),
  resolveAndCacheAccount: mocks.resolveAndCacheAccount,
}));
vi.mock('../riot/match.api.js', () => ({
  getMatchIdsByPuuid: mocks.getMatchIdsByPuuid,
  getMatch: mocks.getMatch,
}));

import { matchService } from './match.service.js';

describe('matchService cache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('caches match ID lists for the configured TTL', async () => {
    mocks.resolveAndCacheAccount.mockResolvedValue({ puuid: 'puuid-1' });
    mocks.getMatchIdsByPuuid.mockResolvedValue(['NA1_100']);

    const first = await matchService.findMatchIdsByRiotId(
      'na1', 'CacheTest', 'LIST1', { count: 10 },
    );
    const second = await matchService.findMatchIdsByRiotId(
      'na1', 'CacheTest', 'LIST1', { count: 10 },
    );

    expect(first).toEqual(second);
    expect(mocks.resolveAndCacheAccount).toHaveBeenCalledTimes(1);
    expect(mocks.getMatchIdsByPuuid).toHaveBeenCalledTimes(1);
  });

  it('returns a cached match detail without calling Riot', async () => {
    const cached = { matchId: 'NA1_200', participants: [] };
    mocks.matchFindUnique.mockResolvedValue(cached);

    await expect(matchService.findMatchById('na1', 'NA1_200')).resolves.toBe(cached);
    expect(mocks.getMatch).not.toHaveBeenCalled();
  });
});
