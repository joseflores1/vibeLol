import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveAndCacheAccount: vi.fn(),
  getMatchIdsByPuuid: vi.fn(),
  getMatch: vi.fn(),
  matchFindUnique: vi.fn(),
  matchFindMany: vi.fn(),
  matchUpsert: vi.fn(),
  participantUpsert: vi.fn(),
}));

vi.mock('../lib/client.js', () => ({
  prisma: {
    match: {
      findUnique: mocks.matchFindUnique,
      findMany: mocks.matchFindMany,
      upsert: mocks.matchUpsert,
    },
    matchParticipant: { upsert: mocks.participantUpsert },
  },
}));
vi.mock('./summoner.service.js', () => ({
  resolveAndCacheAccount: mocks.resolveAndCacheAccount,
}));
vi.mock('../riot/match.api.js', () => ({
  getMatchIdsByPuuid: mocks.getMatchIdsByPuuid,
  getMatch: mocks.getMatch,
}));

import { matchService } from './match.service.js';

describe('matchService cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.matchFindMany.mockResolvedValue([]);
  });

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

  it('drops already-cached custom matches from the visible list', async () => {
    mocks.resolveAndCacheAccount.mockResolvedValue({ puuid: 'puuid-1' });
    mocks.getMatchIdsByPuuid.mockResolvedValue(['NA1_400', 'NA1_401', 'NA1_402']);
    mocks.matchFindMany.mockResolvedValue([{ matchId: 'NA1_401' }]);

    const result = await matchService.findMatchIdsByRiotId(
      'na1', 'CacheTest', 'CUSTOM1', { count: 10 },
    );

    expect(result.matchIds).toEqual(['NA1_400', 'NA1_402']);
    expect(mocks.matchFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          matchId: { in: ['NA1_400', 'NA1_401', 'NA1_402'] },
          isCustom: true,
        },
      }),
    );
  });

  it('returns a cached match detail without calling Riot', async () => {
    const cached = {
      matchId: 'NA1_200',
      participants: [{
        teamId: 100,
        win: true,
        kills: 1,
        deaths: 0,
        assists: 2,
        goldEarned: 1000,
        visionScore: 4,
        wardsPlaced: 1,
        wardsKilled: 0,
        totalMinionsKilled: 10,
        totalDamageDealtToChampions: 500,
        totalDamageTaken: 200,
        damageDealtToObjectives: 50,
        towerKills: 0,
        inhibitorKills: 0,
        baronKills: 0,
        dragonKills: 0,
        perks: {},
      }],
    };
    mocks.matchFindUnique.mockResolvedValue(cached);

    await expect(matchService.findMatchById('na1', 'NA1_200'))
      .resolves.toMatchObject({
        matchId: 'NA1_200',
        teams: [{ teamId: 100, totalGoldEarned: 1000, totalVisionScore: 4 }],
      });
    expect(mocks.getMatch).not.toHaveBeenCalled();
  });

  it('refreshes an old match and returns team aggregates', async () => {
    const riotMatch = {
      metadata: { dataVersion: '2', matchId: 'NA1_300', participants: ['puuid-1'] },
      info: {
        gameCreation: 1_700_000_000_000,
        gameDuration: 1800,
        gameStartTimestamp: 1_700_000_000_000,
        gameEndTimestamp: 1_700_001_800_000,
        gameMode: 'CLASSIC',
        gameType: 'MATCHED_GAME',
        gameVersion: '15.8.1',
        mapId: 11,
        queueId: 420,
        participants: [{
          puuid: 'puuid-1',
          championId: 86,
          championName: 'Garen',
          riotIdGameName: 'CacheTest',
          riotIdTagline: 'MATCH1',
          profileIcon: 1,
          individualPosition: 'TOP',
          teamPosition: 'TOP',
          kills: 5,
          deaths: 1,
          assists: 3,
          goldEarned: 12_000,
          goldSpent: 10_000,
          item0: 1,
          item1: null,
          item2: null,
          item3: null,
          item4: null,
          item5: null,
          item6: 3340,
          summoner1Id: 4,
          summoner2Id: 12,
          teamId: 100,
          win: true,
          visionScore: 20,
          wardsPlaced: 5,
          wardsKilled: 2,
          totalMinionsKilled: 200,
          neutralMinionsKilled: 10,
          champLevel: 18,
          totalDamageDealtToChampions: 25_000,
          totalDamageTaken: 15_000,
          damageDealtToObjectives: 4_000,
          damageSelfMitigated: 8_000,
          totalHeal: 1_000,
          totalTimeCCingOthers: 40,
          doubleKills: 1,
          tripleKills: 0,
          quadraKills: 0,
          pentaKills: 0,
          largestKillingSpree: 3,
          largestMultiKill: 2,
          towerKills: 2,
          inhibitorKills: 1,
          baronKills: 0,
          dragonKills: 1,
          firstBloodKill: false,
          perks: {
            styles: [],
            statPerks: { defense: 5001, flex: 5008, offense: 5005 },
          },
        }],
      },
    };
    const persisted = {
      matchId: 'NA1_300',
      participants: [riotMatch.info.participants[0]],
    };
    mocks.matchFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted);
    mocks.getMatch.mockResolvedValue(riotMatch);
    mocks.matchUpsert.mockResolvedValue({ matchId: 'NA1_300' });

    const result = await matchService.findMatchById('na1', 'NA1_300');

    expect(mocks.getMatch).toHaveBeenCalledTimes(1);
    expect(mocks.participantUpsert).toHaveBeenCalledTimes(1);
    expect(result?.teams).toEqual([expect.objectContaining({
      teamId: 100,
      totalGoldEarned: 12_000,
      totalVisionScore: 20,
      totalDamageDealtToChampions: 25_000,
    })]);
  });
});
