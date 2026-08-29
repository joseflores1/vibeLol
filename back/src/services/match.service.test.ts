import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveAndCacheAccount: vi.fn(),
  getMatchIdsByPuuid: vi.fn(),
  getMatch: vi.fn(),
  getTimeline: vi.fn(),
  matchFindUnique: vi.fn(),
  matchFindMany: vi.fn(),
  matchUpsert: vi.fn(),
  matchUpdate: vi.fn(),
  banDeleteMany: vi.fn(),
  banCreateMany: vi.fn(),
  participantUpsert: vi.fn(),
  participantFindMany: vi.fn(),
}));

vi.mock('../lib/client.js', () => ({
  prisma: {
    match: {
      findUnique: mocks.matchFindUnique,
      findMany: mocks.matchFindMany,
      upsert: mocks.matchUpsert,
      update: mocks.matchUpdate,
    },
    matchBan: {
      deleteMany: mocks.banDeleteMany,
      createMany: mocks.banCreateMany,
    },
    matchParticipant: {
      upsert: mocks.participantUpsert,
      findMany: mocks.participantFindMany,
    },
  },
}));
vi.mock('./summoner.service.js', () => ({
  resolveAndCacheAccount: mocks.resolveAndCacheAccount,
}));
vi.mock('../riot/match.api.js', () => ({
  getMatchIdsByPuuid: mocks.getMatchIdsByPuuid,
  getMatch: mocks.getMatch,
  getTimeline: mocks.getTimeline,
}));

import { matchService } from './match.service.js';

describe('matchService cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.matchFindMany.mockResolvedValue([]);
    mocks.participantFindMany.mockResolvedValue([]);
    mocks.banDeleteMany.mockResolvedValue({ count: 0 });
    mocks.banCreateMany.mockResolvedValue({ count: 0 });
    mocks.matchUpdate.mockResolvedValue({});
  });

  it('serves champion-filtered lists from the cache without calling Riot', async () => {
    mocks.resolveAndCacheAccount.mockResolvedValue({ puuid: 'puuid-1' });
    mocks.participantFindMany.mockResolvedValue([
      { matchId: 'NA1_600' },
      { matchId: 'NA1_601' },
    ]);

    const result = await matchService.findMatchIdsByRiotId(
      'na1', 'CacheTest', 'CHAMP1', { count: 10, champion: 157, queue: 420 },
    );

    expect(result).toEqual({ puuid: 'puuid-1', matchIds: ['NA1_600', 'NA1_601'] });
    expect(mocks.participantFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          puuid: 'puuid-1',
          championId: 157,
          match: { isCustom: false, queueId: 420 },
        },
        take: 10,
      }),
    );
    expect(mocks.getMatchIdsByPuuid).not.toHaveBeenCalled();
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
      bansFetchedAt: new Date(),
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
        teams: [
          { teamId: 100, win: 'Win', bans: [{ championId: 86, pickTurn: 1 }, { championId: 157, pickTurn: 2 }] },
          { teamId: 200, win: 'Fail', bans: [] },
        ],
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
    expect(mocks.banDeleteMany).toHaveBeenCalledWith({ where: { matchId: 'NA1_300' } });
    expect(mocks.banCreateMany).toHaveBeenCalledWith({
      data: [
        { matchId: 'NA1_300', teamId: 100, championId: 86, pickTurn: 1 },
        { matchId: 'NA1_300', teamId: 100, championId: 157, pickTurn: 2 },
      ],
    });
    expect(mocks.matchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { matchId: 'NA1_300' } }),
    );
    expect(result?.teams).toEqual([expect.objectContaining({
      teamId: 100,
      totalGoldEarned: 12_000,
      totalVisionScore: 20,
      totalDamageDealtToChampions: 25_000,
    })]);
  });

  it('re-fetches cached matches whose bans were never parsed', async () => {
    const cached = {
      matchId: 'NA1_210',
      bansFetchedAt: null,
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
    mocks.matchFindUnique
      .mockResolvedValueOnce(cached)
      .mockResolvedValueOnce(cached);
    mocks.getMatch.mockResolvedValue({
      metadata: { dataVersion: '2', matchId: 'NA1_210', participants: ['puuid-1'] },
      info: {
        gameCreation: 1_700_000_000_000,
        gameDuration: 1800,
        gameStartTimestamp: 1_700_000_000_000,
        gameMode: 'ARAM',
        gameType: 'MATCHED_GAME',
        queueId: 450,
        teams: [{ teamId: 100, win: 'Win', bans: [] }],
        participants: [],
      },
    });
    mocks.matchUpsert.mockResolvedValue({ matchId: 'NA1_210' });

    await matchService.findMatchById('na1', 'NA1_210');

    expect(mocks.getMatch).toHaveBeenCalledTimes(1);
    expect(mocks.banDeleteMany).toHaveBeenCalledWith({ where: { matchId: 'NA1_210' } });
    expect(mocks.banCreateMany).not.toHaveBeenCalled();
    expect(mocks.matchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId: 'NA1_210' },
        data: expect.objectContaining({ bansFetchedAt: expect.any(Date) }),
      }),
    );
  });
});

describe('matchService.findTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.matchFindMany.mockResolvedValue([]);
    mocks.banDeleteMany.mockResolvedValue({ count: 0 });
    mocks.banCreateMany.mockResolvedValue({ count: 0 });
    mocks.matchUpdate.mockResolvedValue({});
  });

  const rawTimeline = {
    metadata: { dataVersion: '2', matchId: 'NA1_500', participants: ['puuid-1', 'puuid-2'] },
    info: {
      frameInterval: 60000,
      frames: [
        {
          timestamp: 60000,
          participantFrames: { 1: { participantId: 1, totalGold: 800 } },
          events: [{ type: 'CHAMPION_KILL' }],
        },
      ],
    },
  };

  it('serves the slimmed cached timeline without calling Riot', async () => {
    mocks.matchFindUnique.mockResolvedValue({ timeline: rawTimeline });

    const result = await matchService.findTimeline('na1', 'NA1_500');

    expect(result).toEqual({
      matchId: 'NA1_500',
      puuids: ['puuid-1', 'puuid-2'],
      frames: [
        { timestamp: 60000, participantFrames: { 1: { participantId: 1, totalGold: 800 } } },
      ],
    });
    expect(mocks.getTimeline).not.toHaveBeenCalled();
  });

  it('strips the events array from the served frames', async () => {
    mocks.matchFindUnique.mockResolvedValue({ timeline: rawTimeline });

    const result = await matchService.findTimeline('na1', 'NA1_500');

    expect(JSON.stringify(result)).not.toContain('CHAMPION_KILL');
    expect(JSON.stringify(result)).not.toContain('events');
  });

  it('fetches from Riot and persists the raw timeline on a miss', async () => {
    // findTimeline cache check → miss; findMatchById cache check → miss;
    // findMatchById enrichment re-read → persisted match.
    mocks.matchFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ matchId: 'NA1_500', participants: [] });
    mocks.matchUpsert.mockResolvedValue({ matchId: 'NA1_500' });
    mocks.getMatch.mockResolvedValue({
      metadata: { dataVersion: '2', matchId: 'NA1_500', participants: ['puuid-1'] },
      info: {
        gameCreation: 1_700_000_000_000,
        gameDuration: 1800,
        gameStartTimestamp: 1_700_000_000_000,
        gameMode: 'CLASSIC',
        gameType: 'MATCHED_GAME',
        queueId: 420,
        teams: [],
        participants: [],
      },
    });
    mocks.getTimeline.mockResolvedValue(rawTimeline);

    const result = await matchService.findTimeline('na1', 'NA1_500');

    expect(mocks.getTimeline).toHaveBeenCalledTimes(1);
    expect(mocks.matchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matchId: 'NA1_500' },
        data: expect.objectContaining({ timeline: expect.objectContaining({ info: expect.anything() }) }),
      }),
    );
    expect(result.matchId).toBe('NA1_500');
    expect(result.puuids).toEqual(['puuid-1', 'puuid-2']);
  });
});
