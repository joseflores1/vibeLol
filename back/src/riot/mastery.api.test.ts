import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getByPuuid, getByChampion } from './mastery.api.js';

describe('riot/mastery.api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getByPuuid (full list)', () => {
    it('builds the URL with the correct region host + puuid path', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await getByPuuid('na1', 'puuid789');

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://na1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/puuid789');
    });

    it('URL-encodes the puuid', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      await getByPuuid('euw1', 'p with spaces');

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain('/by-puuid/p%20with%20spaces');
    });

    it('parses and returns a typed array', async () => {
      const entries = [
        {
          puuid: 'p1', championId: 86, championLevel: 30,
          championPoints: 352525, lastPlayTime: 1767510073000,
          championPointsSinceLastLevel: 56925,
          championPointsUntilNextLevel: -45925,
          markRequiredForNextLevel: 2, tokensEarned: 1,
          championSeasonMilestone: 0,
        },
      ];
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(entries), { status: 200 }));

      const data = await getByPuuid('na1', 'p1');

      expect(data).toHaveLength(1);
      expect(data[0]!.championId).toBe(86);
      expect(data[0]!.championLevel).toBe(30);
      expect(data[0]!.championPoints).toBe(352525);
    });

    it('returns an empty array for players with no mastery', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

      const data = await getByPuuid('na1', 'p');

      expect(data).toEqual([]);
    });
  });

  describe('getByChampion (single-champion lookup)', () => {
    it('builds the URL with region + puuid + championId', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({
          puuid: 'p1', championId: 86, championLevel: 30,
          championPoints: 352525, lastPlayTime: 1767510073000,
        }), { status: 200 }),
      );

      await getByChampion('na1', 'p1', 86);

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://na1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/p1/by-champion/86');
    });

    it('URL-encodes both puuid and championId', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({
          puuid: 'p', championId: 1, championLevel: 1,
          championPoints: 1, lastPlayTime: 1,
        }), { status: 200 }),
      );

      await getByChampion('euw1', 'p with spaces', 1);

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain('/by-puuid/p%20with%20spaces/by-champion/1');
    });

    it('parses and returns a single entry', async () => {
      const entry = {
        puuid: 'p1', championId: 86, championLevel: 30,
        championPoints: 352525, lastPlayTime: 1767510073000,
        championPointsSinceLastLevel: 56925,
        championPointsUntilNextLevel: -45925,
        markRequiredForNextLevel: 2, tokensEarned: 1,
        championSeasonMilestone: 0,
      };
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(entry), { status: 200 }));

      const data = await getByChampion('na1', 'p1', 86);

      expect(data.championId).toBe(86);
      expect(data.championLevel).toBe(30);
      expect(data.championPoints).toBe(352525);
    });
  });
});