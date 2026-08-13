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

import { summonerService } from './summoner.service.js';

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
