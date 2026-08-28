import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock the DdragonClient singleton so tests don't need a live Data Dragon
// fetch. Each test sets up the mock values before importing app.
vi.mock('../src/ddragon/client.js', () => {
  const mock = {
    getVersion: vi.fn(),
    getChampions: vi.fn(),
    getItems: vi.fn(),
    getSpells: vi.fn(),
    getRunes: vi.fn(),
  };
  return { ddragonClient: mock };
});

const { ddragonClient } = await import('../src/ddragon/client.js');
const { app } = await import('../src/app.js');

// Route tests for /api/v1/static/* endpoints.
// The DdragonClient is mocked, so no live Data Dragon fetch.
describe('GET /api/v1/static/*', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /version returns 200 { success, data: { version } }', async () => {
    (ddragonClient.getVersion as ReturnType<typeof vi.fn>).mockReturnValueOnce('16.15.1');

    const res = await request(app).get('/api/v1/static/version');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { version: '16.15.1' } });
  });

  it('GET /champions returns 200 { success, data: { version, champions } }', async () => {
    (ddragonClient.getVersion as ReturnType<typeof vi.fn>).mockReturnValueOnce('16.15.1');
    (ddragonClient.getChampions as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Map([
        [266, { key: 266, id: 'Aatrox', name: 'Aatrox', title: 'the Darkin Blade', tags: ['Fighter'] }],
        [157, { key: 157, id: 'Ahri', name: 'Ahri', title: 'the Nine-Tailed Fox', tags: ['Mage', 'Assassin'] }],
      ]),
    );

    const res = await request(app).get('/api/v1/static/champions');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        version: '16.15.1',
        champions: [
          { key: 266, name: 'Aatrox' },
          { key: 157, name: 'Ahri' },
        ],
      },
    });
  });

  it('GET /items returns 200 { success, data: { version, items } }', async () => {
    (ddragonClient.getVersion as ReturnType<typeof vi.fn>).mockReturnValueOnce('16.15.1');
    (ddragonClient.getItems as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Map([
        [1001, { id: 1001, name: 'Boots', gold: 300 }],
      ]),
    );

    const res = await request(app).get('/api/v1/static/items');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        version: '16.15.1',
        items: [{ id: 1001, name: 'Boots', gold: 300 }],
      },
    });
  });

  it('GET /spells returns 200 { success, data: { version, spells } }', async () => {
    (ddragonClient.getVersion as ReturnType<typeof vi.fn>).mockReturnValueOnce('16.15.1');
    (ddragonClient.getSpells as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Map([
        [4, { key: 4, name: 'Flash', id: 'SummonerFlash' }],
      ]),
    );

    const res = await request(app).get('/api/v1/static/spells');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        version: '16.15.1',
        spells: [{ key: 4, name: 'Flash', id: 'SummonerFlash' }],
      },
    });
  });

  it('GET /runes returns 200 { success, data: { version, runes } }', async () => {
    (ddragonClient.getVersion as ReturnType<typeof vi.fn>).mockReturnValueOnce('16.15.1');
    (ddragonClient.getRunes as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Map([
        [8112, {
          id: 8112,
          key: 'Electrocute',
          name: 'Electrocute',
          shortDesc: '',
          longDesc: '',
          icon: 'perk-images/styles/domination/electrocute/electrocute.png',
          styleId: 8100,
          styleKey: 'Domination',
          styleName: 'Domination',
        }],
      ]),
    );

    const res = await request(app).get('/api/v1/static/runes');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        version: '16.15.1',
        runes: [{ id: 8112, key: 'Electrocute', styleKey: 'Domination' }],
      },
    });
  });

  it('GET /queues returns the static queue catalog with analytics flags', async () => {
    const res = await request(app).get('/api/v1/static/queues');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const queues = res.body.data.queues as Array<{ id: number; analyticsEligible: boolean }>;
    expect(queues.length).toBeGreaterThan(0);
    // ARAM must stay analytics-ineligible; Ranked Solo must stay eligible.
    expect(queues.find((q) => q.id === 450)?.analyticsEligible).toBe(false);
    expect(queues.find((q) => q.id === 420)?.analyticsEligible).toBe(true);
  });
});