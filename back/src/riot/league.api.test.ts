import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEntriesByPuuid } from './league.api.js';

describe('riot/league.api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the URL with the correct region host + puuid path', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    await getEntriesByPuuid('na1', 'puuid789');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://na1.api.riotgames.com/lol/league/v4/entries/by-puuid/puuid789');
  });

  it('URL-encodes the puuid', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    await getEntriesByPuuid('euw1', 'p with spaces');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/by-puuid/p%20with%20spaces');
  });

  it('sends the X-Riot-Token header', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    await getEntriesByPuuid('kr', 'p');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.headers).toEqual({ 'X-Riot-Token': 'test-riot-key' });
  });

  it('parses and returns a typed array of entries', async () => {
    const entries = [
      {
        queueType: 'RANKED_SOLO_5x5', tier: 'CHALLENGER', rank: 'I',
        puuid: 'p1', leaguePoints: 3236, wins: 447, losses: 256,
        veteran: true, inactive: false, freshBlood: false, hotStreak: false,
      },
      {
        queueType: 'RANKED_FLEX_SR', tier: 'DIAMOND', rank: 'II',
        puuid: 'p1', leaguePoints: 50, wins: 30, losses: 25,
        veteran: false, inactive: false, freshBlood: true, hotStreak: false,
      },
    ];
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(entries), { status: 200 }));

    const data = await getEntriesByPuuid('na1', 'p1');

    expect(data).toHaveLength(2);
    expect(data[0]!.tier).toBe('CHALLENGER');
    expect(data[0]!.queueType).toBe('RANKED_SOLO_5x5');
    expect(data[1]!.tier).toBe('DIAMOND');
  });

  it('returns an empty array for unranked players', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    const data = await getEntriesByPuuid('na1', 'p');

    expect(data).toEqual([]);
  });
});