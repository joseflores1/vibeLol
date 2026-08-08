import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock the account service before importing app (app pulls in the router
// which pulls in the controller which pulls in the service).
vi.mock('../src/services/account.service.js', () => ({
  accountService: {
    findByRiotId: vi.fn(),
  },
}));

const { accountService } = await import('../src/services/account.service.js');
const { app } = await import('../src/app.js');

// Route tests for /api/v1/summoners/by-riot-id/:gameName/:tagLine.
// The service is mocked, so no Riot call and no DB access.
describe('GET /api/v1/summoners/by-riot-id/:gameName/:tagLine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 { success:true, data } on a hit', async () => {
    (accountService.findByRiotId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      puuid: 'abc123',
      gameName: 'Doublelift',
      tagLine: 'NA1',
      region: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const res = await request(app).get('/api/v1/summoners/by-riot-id/Doublelift/NA1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { puuid: 'abc123', gameName: 'Doublelift', tagLine: 'NA1' },
    });
  });

  it('propagates ApiError 404 when service throws notFound', async () => {
    const { ApiError } = await import('../src/utils/ApiError.js');
    (accountService.findByRiotId as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      ApiError.notFound('Riot API 404: no player'),
    );

    const res = await request(app).get('/api/v1/summoners/by-riot-id/NoSuch/X');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: expect.stringContaining('404') });
  });
});