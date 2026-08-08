import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock the match service before importing app.
vi.mock('../src/services/match.service.js', () => ({
  matchService: {
    findMatchIdsByRiotId: vi.fn(),
    findMatchById: vi.fn(),
  },
}));

const { matchService } = await import('../src/services/match.service.js');
const { app } = await import('../src/app.js');

// Route tests for the match-related endpoints, all summoner-scoped.
// The service is mocked, so no Riot call and no DB access.
describe('Match endpoints (summoner-scoped)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/matches', () => {
    it('returns 200 { success, data: { puuid, matchIds } } on a hit', async () => {
      (matchService.findMatchIdsByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'abc123',
        matchIds: ['NA1_100', 'NA1_101', 'NA1_102'],
      });

      const res = await request(app).get('/api/v1/summoners/by-riot-id/Doublelift/NA1/matches?region=na1&count=3');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          puuid: 'abc123',
          matchIds: ['NA1_100', 'NA1_101', 'NA1_102'],
        },
      });
    });

    it('defaults region to na1 and count to 20 when omitted', async () => {
      (matchService.findMatchIdsByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'x',
        matchIds: [],
      });

      const res = await request(app).get('/api/v1/summoners/by-riot-id/G/T/matches');

      expect(res.status).toBe(200);
      expect(matchService.findMatchIdsByRiotId).toHaveBeenCalledWith(
        'na1', 'G', 'T',
        expect.objectContaining({ start: 0, count: 20 }),
      );
    });

    it('passes through query filters (queue, type, start, count)', async () => {
      (matchService.findMatchIdsByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'x',
        matchIds: [],
      });

      await request(app).get('/api/v1/summoners/by-riot-id/G/T/matches?region=euw1&start=10&count=50&queue=420&type=ranked');

      expect(matchService.findMatchIdsByRiotId).toHaveBeenCalledWith(
        'euw1', 'G', 'T',
        expect.objectContaining({ start: 10, count: 50, queue: 420, type: 'ranked' }),
      );
    });

    it('returns 400 when count > 100', async () => {
      const res = await request(app).get('/api/v1/summoners/by-riot-id/G/T/matches?count=200');

      expect(res.status).toBe(400);
    });

    it('returns 400 when region is invalid', async () => {
      const res = await request(app).get('/api/v1/summoners/by-riot-id/G/T/matches?region=xx1');

      expect(res.status).toBe(400);
    });

    it('propagates ApiError 404 when Riot ID is unknown', async () => {
      const { ApiError } = await import('../src/utils/ApiError.js');
      (matchService.findMatchIdsByRiotId as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        ApiError.notFound('Riot API 404: no player'),
      );

      const res = await request(app).get('/api/v1/summoners/by-riot-id/NoSuch/X/matches?region=na1');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/matches/:matchId', () => {
    const sampleMatch = {
      matchId: 'NA1_1234567890',
      dataVersion: '2',
      gameCreation: new Date('2024-01-01T00:00:00.000Z'),
      gameDuration: 1800,
      gameStartTimestamp: new Date('2024-01-01T00:00:01.000Z'),
      gameEndTimestamp: null,
      gameMode: 'CLASSIC',
      gameType: 'MATCHED_GAME',
      gameVersion: '14.1.123',
      mapId: 11,
      queueId: 420,
      participants: [],
    };

    it('returns 200 { success, data: match } on a hit', async () => {
      (matchService.findMatchById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(sampleMatch);

      const res = await request(app).get('/api/v1/summoners/by-riot-id/Doublelift/NA1/matches/NA1_1234567890?region=na1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: { matchId: 'NA1_1234567890', gameMode: 'CLASSIC', queueId: 420 },
      });
    });

    it('returns 400 on malformed matchId', async () => {
      const res = await request(app).get('/api/v1/summoners/by-riot-id/G/T/matches/invalid_id?region=na1');

      expect(res.status).toBe(400);
    });

    it('propagates ApiError 404 when match is not found on Riot', async () => {
      const { ApiError } = await import('../src/utils/ApiError.js');
      (matchService.findMatchById as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        ApiError.notFound('Riot API 404: match not found'),
      );

      const res = await request(app).get('/api/v1/summoners/by-riot-id/G/T/matches/NA1_9999999999?region=na1');

      expect(res.status).toBe(404);
    });
  });
});