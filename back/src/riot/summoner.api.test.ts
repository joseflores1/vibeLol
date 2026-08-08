import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getByPuuid } from './summoner.api.js';

// Unit tests for the Summoner v4 API wrapper. Mocks global fetch — no
// network calls, no real Riot key. Covers URL building (region host +
// puuid encoding) and response parsing.
describe('riot/summoner.api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the URL with the correct region host + puuid path', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        puuid: 'puuid789',
        profileIconId: 6,
        revisionDate: 1700000000000,
        summonerLevel: 100,
      }), { status: 200 }),
    );

    await getByPuuid('na1', 'puuid789');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/puuid789');
  });

  it('sends the X-Riot-Token header', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        puuid: 'p', profileIconId: 0, revisionDate: 0, summonerLevel: 1,
      }), { status: 200 }),
    );

    await getByPuuid('euw1', 'p');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.headers).toEqual({ 'X-Riot-Token': 'test-riot-key' });
  });

  it('URL-encodes the puuid', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        puuid: 'p', profileIconId: 0, revisionDate: 0, summonerLevel: 1,
      }), { status: 200 }),
    );

    await getByPuuid('kr', 'puuid with spaces');

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/by-puuid/puuid%20with%20spaces');
  });

  it('parses and returns the summoner data typed', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        puuid: 'puuid789',
        profileIconId: 7,
        revisionDate: 1700000000000,
        summonerLevel: 500,
      }), { status: 200 }),
    );

    const data = await getByPuuid('kr', 'puuid789');

    expect(data).toEqual({
      id: undefined,
      accountId: undefined,
      puuid: 'puuid789',
      name: undefined,
      profileIconId: 7,
      revisionDate: 1700000000000,
      summonerLevel: 500,
    });
  });

  it('accepts null name (un-named summoners post Riot ID migration)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        puuid: 'p', name: null, profileIconId: 0, revisionDate: 0, summonerLevel: 1,
      }), { status: 200 }),
    );

    const data = await getByPuuid('na1', 'p');

    expect(data.name).toBeNull();
  });

  it('accepts responses with only the 4 core fields (post-migration)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        puuid: 'p', profileIconId: 0, revisionDate: 0, summonerLevel: 1,
      }), { status: 200 }),
    );

    const data = await getByPuuid('na1', 'p');

    expect(data.puuid).toBe('p');
    expect(data.summonerLevel).toBe(1);
    expect(data.id).toBeUndefined();
  });
});