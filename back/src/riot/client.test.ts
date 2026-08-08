import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { riotGet, type RiotPlatform } from './client.js';

// Unit tests for the Riot HTTP wrapper. Mocks global fetch so no network
// calls are made and no real Riot key is needed. Covers the critical
// behaviors: X-Riot-Token header, 429 + Retry-After retry, error mapping.
describe('riot/client', () => {
  const platform: RiotPlatform = 'americas';
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the X-Riot-Token header from env', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    await riotGet(platform, '/riot/account/v1/accounts/by-riot-id/A/B');
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.headers).toEqual({ 'X-Riot-Token': 'test-riot-key' });
  });

  it('returns parsed JSON on 200', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ puuid: 'abc' }), { status: 200 }),
    );
    const data = await riotGet<{ puuid: string }>(platform, '/x');
    expect(data).toEqual({ puuid: 'abc' });
  });

  it('retries once on 429, honoring Retry-After', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(new Response('rate', { status: 429, headers: { 'Retry-After': '2' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const p = riotGet(platform, '/x');
    await vi.advanceTimersByTimeAsync(2100);
    const data = await p;
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws ApiError.notFound (404) on Riot 404', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: { message: 'no player' } }), { status: 404 }),
    );
    await expect(riotGet(platform, '/x')).rejects.toMatchObject({
      statusCode: 404,
      name: 'ApiError',
    });
  });

  it('throws ApiError.unauthorized on 401', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: { message: 'bad token' } }), { status: 401 }),
    );
    await expect(riotGet(platform, '/x')).rejects.toMatchObject({
      statusCode: 401,
      name: 'ApiError',
    });
  });

  it('throws ApiError with status on 500', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: { message: 'boom' } }), { status: 500 }),
    );
    await expect(riotGet(platform, '/x')).rejects.toMatchObject({
      statusCode: 500,
      name: 'ApiError',
    });
  });

  it('forges the URL from platform + path', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await riotGet(platform, '/riot/account/v1/accounts/by-riot-id/A/B');
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/A/B');
  });
});