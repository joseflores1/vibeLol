import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock the summoner service before importing app (app pulls in the router
// which pulls in the controller which pulls in the service).
vi.mock('../src/services/summoner.service.js', () => ({
  summonerService: {
    findByRiotId: vi.fn(),
  },
}));

const { summonerService } = await import('../src/services/summoner.service.js');
const { app } = await import('../src/app.js');

// Route tests for /api/v1/summoners/by-riot-id/:gameName/:tagLine.
// The service is mocked, so no Riot call and no DB access.
describe('GET /api/v1/summoners/by-riot-id/:gameName/:tagLine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 { success:true, data } with account + summoner on a hit', async () => {
    (summonerService.findByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      account: {
        puuid: 'abc123',
        gameName: 'Doublelift',
        tagLine: 'NA1',
        region: 'na1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      summoner: {
        puuid: 'abc123',
        summonerId: null,
        name: null,
        summonerLevel: 500,
        profileIconId: 6,
        revisionDate: new Date('2026-01-01T00:00:00.000Z'),
        region: 'na1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const res = await request(app).get('/api/v1/summoners/by-riot-id/Doublelift/NA1?region=na1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        account: { puuid: 'abc123', gameName: 'Doublelift', region: 'na1' },
        summoner: { puuid: 'abc123', summonerLevel: 500, region: 'na1' },
      },
    });
  });

  it('defaults region to na1 when omitted', async () => {
    (summonerService.findByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      account: { puuid: 'x', gameName: 'G', tagLine: 'T', region: 'na1', updatedAt: new Date() },
      summoner: { summonerId: 's', puuid: 'x', summonerLevel: 1, profileIconId: 0, revisionDate: new Date(), region: 'na1', updatedAt: new Date() },
    });

    const res = await request(app).get('/api/v1/summoners/by-riot-id/G/T');

    expect(res.status).toBe(200);
    expect(summonerService.findByRiotId).toHaveBeenCalledWith('na1', 'G', 'T');
  });

  it('accepts other valid regions (euw1, kr, etc.)', async () => {
    (summonerService.findByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      account: { puuid: 'x', gameName: 'G', tagLine: 'T', region: 'euw1', updatedAt: new Date() },
      summoner: { summonerId: 's', puuid: 'x', summonerLevel: 1, profileIconId: 0, revisionDate: new Date(), region: 'euw1', updatedAt: new Date() },
    });

    const res = await request(app).get('/api/v1/summoners/by-riot-id/G/T?region=euw1');

    expect(res.status).toBe(200);
    expect(summonerService.findByRiotId).toHaveBeenCalledWith('euw1', 'G', 'T');
  });

  it('returns 400 on an invalid region', async () => {
    const res = await request(app).get('/api/v1/summoners/by-riot-id/G/T?region=xx1');

    expect(res.status).toBe(400);
  });

  it('propagates ApiError 404 when service throws notFound', async () => {
    const { ApiError } = await import('../src/utils/ApiError.js');
    (summonerService.findByRiotId as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      ApiError.notFound('Riot API 404: no player'),
    );

    const res = await request(app).get('/api/v1/summoners/by-riot-id/NoSuch/X?region=na1');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: expect.stringContaining('404') });
  });
});