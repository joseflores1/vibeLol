import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accountFindUnique: vi.fn(),
  accountUpsert: vi.fn(),
  summonerFindUnique: vi.fn(),
  summonerUpsert: vi.fn(),
  getByRiotId: vi.fn(),
  getByPuuid: vi.fn(),
}));

vi.mock('../lib/client.js', () => ({
  prisma: {
    account: {
      findUnique: mocks.accountFindUnique,
      upsert: mocks.accountUpsert,
    },
    summoner: {
      findUnique: mocks.summonerFindUnique,
      upsert: mocks.summonerUpsert,
    },
  },
}));
vi.mock('../riot/account.api.js', () => ({ getByRiotId: mocks.getByRiotId }));
vi.mock('../riot/summoner.api.js', () => ({ getByPuuid: mocks.getByPuuid }));

import { resolveAndCacheAccount, summonerService } from './summoner.service.js';

describe('resolveAndCacheAccount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the fresh cached row without calling Riot', async () => {
    const account = {
      puuid: 'puuid-1',
      gameName: 'Faker',
      tagLine: 'KR1',
      region: 'kr',
      updatedAt: new Date(),
    };
    mocks.accountFindUnique.mockResolvedValue(account);

    await expect(resolveAndCacheAccount('kr', 'Faker', 'KR1'))
      .resolves.toEqual(account);
    expect(mocks.getByRiotId).not.toHaveBeenCalled();
    expect(mocks.accountUpsert).not.toHaveBeenCalled();
  });

  it('resolves through Riot and returns the persisted row on a stale cache', async () => {
    const stale = {
      puuid: 'puuid-1',
      gameName: 'Faker',
      tagLine: 'KR1',
      region: 'kr',
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    };
    const riotAccount = { puuid: 'puuid-1', gameName: 'Faker', tagLine: 'KR1' };
    const persisted = { ...riotAccount, region: 'kr', updatedAt: new Date() };
    mocks.accountFindUnique.mockResolvedValue(stale);
    mocks.getByRiotId.mockResolvedValue(riotAccount);
    mocks.accountUpsert.mockResolvedValue(persisted);

    await expect(resolveAndCacheAccount('kr', 'Faker', 'KR1'))
      .resolves.toEqual(persisted);
    expect(mocks.getByRiotId).toHaveBeenCalledTimes(1);
    expect(mocks.accountUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { puuid: 'puuid-1' } }),
    );
  });

  it('resolves through Riot when no cache row exists', async () => {
    const riotAccount = { puuid: 'puuid-2', gameName: 'Caps', tagLine: 'EUW' };
    const persisted = { ...riotAccount, region: 'euw1', updatedAt: new Date() };
    mocks.accountFindUnique.mockResolvedValue(null);
    mocks.getByRiotId.mockResolvedValue(riotAccount);
    mocks.accountUpsert.mockResolvedValue(persisted);

    await expect(resolveAndCacheAccount('euw1', 'Caps', 'EUW'))
      .resolves.toEqual(persisted);
    expect(mocks.getByRiotId).toHaveBeenCalledTimes(1);
  });
});

describe('summonerService cache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns fresh Account and Summoner rows without calling Riot', async () => {
    const account = {
      puuid: 'puuid-1',
      gameName: 'Faker',
      tagLine: 'KR1',
      region: 'kr',
      updatedAt: new Date(),
    };
    const summoner = {
      puuid: 'puuid-1',
      region: 'kr',
      updatedAt: new Date(),
    };
    mocks.accountFindUnique.mockResolvedValue(account);
    mocks.summonerFindUnique.mockResolvedValue(summoner);

    await expect(summonerService.findByRiotId('kr', 'Faker', 'KR1'))
      .resolves.toEqual({ account, summoner });
    expect(mocks.getByRiotId).not.toHaveBeenCalled();
    expect(mocks.getByPuuid).not.toHaveBeenCalled();
  });

  it('refreshes stale Account and Summoner rows from Riot', async () => {
    const account = {
      puuid: 'puuid-1',
      gameName: 'Faker',
      tagLine: 'KR1',
      region: 'kr',
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    };
    const refreshedAccount = { ...account, updatedAt: new Date() };
    const riotAccount = { puuid: 'puuid-1', gameName: 'Faker', tagLine: 'KR1' };
    const riotSummoner = {
      puuid: 'puuid-1',
      id: 'summoner-1',
      name: 'Faker',
      profileIconId: 1,
      revisionDate: 1_700_000_000_000,
      summonerLevel: 500,
    };
    const refreshedSummoner = { ...riotSummoner, region: 'kr', updatedAt: new Date() };
    mocks.accountFindUnique.mockResolvedValue(account);
    mocks.accountUpsert.mockResolvedValue(refreshedAccount);
    mocks.summonerFindUnique.mockResolvedValue(undefined);
    mocks.getByRiotId.mockResolvedValue(riotAccount);
    mocks.getByPuuid.mockResolvedValue(riotSummoner);
    mocks.summonerUpsert.mockResolvedValue(refreshedSummoner);

    await expect(summonerService.findByRiotId('kr', 'Faker', 'KR1'))
      .resolves.toEqual({ account: refreshedAccount, summoner: refreshedSummoner });
    expect(mocks.getByRiotId).toHaveBeenCalledTimes(1);
    expect(mocks.getByPuuid).toHaveBeenCalledTimes(1);
  });
});
