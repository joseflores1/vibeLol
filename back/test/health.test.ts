import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock the prisma client so the health check doesn't need a real DB.
vi.mock('../src/lib/client.js', () => ({
  prisma: {
    // $queryRaw is a tagged template in real code; a plain fn mock suffices.
    $queryRaw: vi.fn(),
  },
}));

const { prisma } = await import('../src/lib/client.js');
const { app } = await import('../src/app.js');

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 ok when the DB query succeeds', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ '?column?': 1 }]);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'connected' });
  });

  it('returns 500 when the DB query throws', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: 'error', db: 'disconnected' });
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.status).toBe(404);
  });
});