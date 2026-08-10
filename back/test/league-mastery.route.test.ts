import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock both services before importing app.
vi.mock('../src/services/league.service.js', () => ({
  leagueService: { findEntriesByRiotId: vi.fn() },
}));
vi.mock('../src/services/mastery.service.js', () => ({
  masteryService: {
    findByRiotId: vi.fn(),
    findByChampion: vi.fn(),
  },
}));

const { leagueService } = await import('../src/services/league.service.js');
const { masteryService } = await import('../src/services/mastery.service.js');
const { ApiError } = await import('../src/utils/ApiError.js');
const { app } = await import('../src/app.js');

// Route tests for the League + Champion Mastery endpoints, all
// summoner-scoped. The services are mocked — no Riot call or DB access.
describe('League + Mastery endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/league', () => {
    it('returns 200 { puuid, entries } on a hit', async () => {
      (leagueService.findEntriesByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'abc123',
        entries: [
          {
            puuid: 'abc123', queueType: 'RANKED_SOLO_5x5', tier: 'DIAMOND',
            rank: 'II', leaguePoints: 50, wins: 30, losses: 25,
            veteran: false, inactive: false, freshBlood: false, hotStreak: false,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      });

      const res = await request(app).get('/api/v1/summoners/by-riot-id/Player/NA1/league?region=na1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          puuid: 'abc123',
          entries: [{ queueType: 'RANKED_SOLO_5x5', tier: 'DIAMOND' }],
        },
      });
    });

    it('returns 200 with empty entries array for unranked players', async () => {
      (leagueService.findEntriesByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'unranked',
        entries: [],
      });

      const res = await request(app).get('/api/v1/summoners/by-riot-id/Unranked/NA1/league?region=na1');

      expect(res.status).toBe(200);
      expect(res.body.data.entries).toEqual([]);
    });

    it('defaults region to na1 when omitted', async () => {
      (leagueService.findEntriesByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'x', entries: [],
      });

      const res = await request(app).get('/api/v1/summoners/by-riot-id/G/T/league');

      expect(res.status).toBe(200);
      expect(leagueService.findEntriesByRiotId).toHaveBeenCalledWith('na1', 'G', 'T');
    });

    it('propagates ApiError 404 when Riot ID is unknown', async () => {
      (leagueService.findEntriesByRiotId as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        ApiError.notFound('Riot API 404: no player'),
      );

      const res = await request(app).get('/api/v1/summoners/by-riot-id/NoSuch/X/league?region=na1');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/mastery', () => {
    it('returns 200 { puuid, masteries } on a hit', async () => {
      (masteryService.findByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'abc123',
        masteries: [
          {
            puuid: 'abc123', championId: 86, championLevel: 30,
            championPoints: 352525, lastPlayTime: new Date('2026-01-01T00:00:00.000Z'),
            championPointsSinceLastLevel: 56925, championPointsUntilNextLevel: -45925,
            markRequiredForNextLevel: 2, tokensEarned: 1, championSeasonMilestone: 0,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      });

      const res = await request(app).get('/api/v1/summoners/by-riot-id/Player/NA1/mastery?region=na1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          puuid: 'abc123',
          masteries: [{ championId: 86, championLevel: 30, championPoints: 352525 }],
        },
      });
    });

    it('returns 200 with empty masteries for player with no data', async () => {
      (masteryService.findByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'x',
        masteries: [],
      });

      const res = await request(app).get('/api/v1/summoners/by-riot-id/New/NA1/mastery?region=na1');

      expect(res.status).toBe(200);
      expect(res.body.data.masteries).toEqual([]);
    });
  });

  describe('GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/mastery/:championId', () => {
    it('returns 200 { puuid, mastery } for a champion the player has mastery on', async () => {
      (masteryService.findByChampion as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'abc123',
        mastery: {
          puuid: 'abc123', championId: 86, championLevel: 30,
          championPoints: 352525, lastPlayTime: new Date('2026-01-01T00:00:00.000Z'),
          championPointsSinceLastLevel: 56925, championPointsUntilNextLevel: -45925,
          markRequiredForNextLevel: 2, tokensEarned: 1, championSeasonMilestone: 0,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });

      const res = await request(app).get('/api/v1/summoners/by-riot-id/Player/NA1/mastery/86?region=na1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          puuid: 'abc123',
          mastery: { championId: 86, championPoints: 352525 },
        },
      });
    });

    it('passes the championId (coerced to number) to the service', async () => {
      (masteryService.findByChampion as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        puuid: 'abc',
        mastery: { championId: 86, championLevel: 1, championPoints: 1 },
      });

      await request(app).get('/api/v1/summoners/by-riot-id/P/NA1/mastery/86?region=na1');

      expect(masteryService.findByChampion).toHaveBeenCalledWith('na1', 'P', 'NA1', 86);
    });

    it('propagates ApiError 404 when player has no mastery for that champion', async () => {
      (masteryService.findByChampion as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        ApiError.notFound('Riot API 404: champion not played'),
      );

      const res = await request(app).get('/api/v1/summoners/by-riot-id/Player/NA1/mastery/999?region=na1');

      expect(res.status).toBe(404);
    });
  });
});