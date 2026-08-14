import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMatchIdsByPuuid, getMatch, type MatchListOptions } from './match.api.js';

// Unit tests for the Match v5 API wrapper. Mocks global fetch — no
// network calls, no real Riot key. Covers URL building (cluster host +
// puuid/matchId encoding), query-param encoding, and response parsing.
describe('riot/match.api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMatchIdsByPuuid', () => {
    it('builds the URL with the correct cluster host + puuid path', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(['NA1_123', 'NA1_456']), { status: 200 }),
      );

      await getMatchIdsByPuuid('americas', 'puuid789');

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/puuid789/ids');
    });

    it('appends query params when provided', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(['NA1_123']), { status: 200 }),
      );

      const opts: MatchListOptions = { start: 10, count: 50, type: 'ranked', queue: 420 };
      await getMatchIdsByPuuid('americas', 'p', opts);

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain('start=10');
      expect(url).toContain('count=50');
      expect(url).toContain('type=ranked');
      expect(url).toContain('queue=420');
    });

    it('omits query string when no options are provided', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );

      await getMatchIdsByPuuid('europe', 'p');

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).not.toContain('?');
    });

    it('returns string[] on success', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(['NA1_1', 'NA1_2', 'NA1_3']), { status: 200 }),
      );

      const ids = await getMatchIdsByPuuid('americas', 'p');

      expect(ids).toEqual(['NA1_1', 'NA1_2', 'NA1_3']);
    });

    it('URL-encodes the puuid', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );

      await getMatchIdsByPuuid('asia', 'p with spaces');

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain('/by-puuid/p%20with%20spaces/ids');
    });

    it('sends the X-Riot-Token header', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      );

      await getMatchIdsByPuuid('americas', 'p');

      const [, init] = fetchMock.mock.calls[0]!;
      expect(init?.headers).toEqual({ 'X-Riot-Token': 'test-riot-key' });
    });
  });

  describe('getMatch', () => {
    const sampleMatch = {
      metadata: {
        dataVersion: '2',
        matchId: 'NA1_1234567890',
        participants: ['puuid1', 'puuid2', 'puuid3', 'puuid4', 'puuid5',
          'puuid6', 'puuid7', 'puuid8', 'puuid9', 'puuid10'],
      },
      info: {
        gameCreation: 1700000000000,
        gameDuration: 1800,
        gameStartTimestamp: 1700000001000,
        gameEndTimestamp: 1700001800000,
        gameMode: 'CLASSIC',
        gameType: 'MATCHED_GAME',
        gameVersion: '14.1.123',
        mapId: 11,
        queueId: 420,
        participants: Array.from({ length: 10 }, (_, i) => ({
          puuid: `puuid${i + 1}`,
          championId: 100 + i,
          championName: `Champ${i}`,
          kills: i,
          deaths: 9 - i,
          assists: i * 2,
          goldEarned: 10000 + i * 500,
          item0: i,
          item1: i + 1,
          item2: i + 2,
          item3: i + 3,
          item4: i + 4,
          item5: i + 5,
          item6: i + 6,
          summoner1Id: 4,
          summoner2Id: 7,
          teamId: i < 5 ? 100 : 200,
          win: i < 5,
          visionScore: 10 + i,
          wardsPlaced: 5 + i,
          wardsKilled: 2,
          totalMinionsKilled: 100 + i * 10,
        })),
      },
    };

    it('builds the URL with the correct cluster host + matchId', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(sampleMatch), { status: 200 }),
      );

      await getMatch('americas', 'NA1_1234567890');

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://americas.api.riotgames.com/lol/match/v5/matches/NA1_1234567890');
    });

    it('URL-encodes the matchId', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(sampleMatch), { status: 200 }),
      );

      await getMatch('europe', 'EUW_1_abc');

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain('/matches/EUW_1_abc');
    });

    it('parses and returns the match data typed', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(sampleMatch), { status: 200 }),
      );

      const data = await getMatch('americas', 'NA1_1234567890');

      expect(data.metadata.matchId).toBe('NA1_1234567890');
      expect(data.info.gameMode).toBe('CLASSIC');
      expect(data.info.queueId).toBe(420);
      expect(data.info.participants).toHaveLength(10);
      expect(data.info.participants[0]!.puuid).toBe('puuid1');
      expect(data.info.participants[0]!.win).toBe(true);
      expect(data.info.participants[5]!.win).toBe(false);
    });

    it('parses rich participant metrics and perks', async () => {
      const richMatch = {
        ...sampleMatch,
        info: {
          ...sampleMatch.info,
          participants: [{
            ...sampleMatch.info.participants[0],
            riotIdGameName: 'Faker',
            riotIdTagline: 'KR1',
            individualPosition: 'MIDDLE',
            teamPosition: 'MIDDLE',
            totalDamageDealtToChampions: 25_000,
            goldSpent: 10_000,
            pentaKills: 1,
            perks: {
              styles: [{
                description: 'primaryStyle',
                style: 8100,
                selections: [{ perk: 8112, var1: 0, var2: 0, var3: 0 }],
              }],
              statPerks: { offense: 5005, flex: 5008, defense: 5001 },
            },
          }],
        },
      };
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(richMatch), { status: 200 }),
      );

      const data = await getMatch('americas', 'NA1_1234567890');

      expect(data.info.participants[0]!.riotIdGameName).toBe('Faker');
      expect(data.info.participants[0]!.totalDamageDealtToChampions).toBe(25_000);
      expect(data.info.participants[0]!.perks?.styles[0]?.selections[0]?.perk).toBe(8112);
    });

    it('accepts null values for optional fields', async () => {
      const matchWithNull = {
        metadata: { matchId: 'NA1_1', participants: ['p1'] },
        info: {
          gameCreation: 0,
          gameDuration: 0,
          gameStartTimestamp: 0,
          gameMode: 'CLASSIC',
          gameType: 'MATCHED_GAME',
          participants: [{
            puuid: 'p1',
            championId: 1,
            championName: 'A',
            kills: 0,
            deaths: 0,
            assists: 0,
            goldEarned: 0,
            item0: null,
            summoner1Id: 0,
            summoner2Id: 0,
            teamId: 100,
            win: true,
          }],
        },
      };
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(matchWithNull), { status: 200 }),
      );

      const data = await getMatch('americas', 'NA1_1');

      expect(data.info.participants[0]!.item0).toBeNull();
    });
  });
});
