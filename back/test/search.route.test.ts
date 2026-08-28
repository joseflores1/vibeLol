import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/services/search.service.js', () => ({
  searchService: {
    suggest: vi.fn(),
  },
}));

const { searchService } = await import('../src/services/search.service.js');
const { app } = await import('../src/app.js');

// Route tests for GET /api/v1/search/suggest.
describe('GET /api/v1/search/suggest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 { success, data: { suggestions } } on a hit', async () => {
    (searchService.suggest as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { gameName: 'Faker', tagLine: 'KR1' },
    ]);

    const res = await request(app).get('/api/v1/search/suggest?q=faker');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { suggestions: [{ gameName: 'Faker', tagLine: 'KR1' }] },
    });
  });

  it('returns 400 when q is shorter than 2 characters', async () => {
    const res = await request(app).get('/api/v1/search/suggest?q=f');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/v1/search/suggest');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
