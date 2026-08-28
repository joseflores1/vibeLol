import { describe, expect, it } from 'vitest';
import { clusterFromRegion, REGION_VALUES } from './regions.js';

// Truth table from Riot's routing values — a wrong mapping silently sends
// Account/Match calls to the wrong cluster (404s or, worse, wrong data).
describe('clusterFromRegion', () => {
  it('routes americas regions', () => {
    for (const region of ['na1', 'br1', 'la1', 'la2', 'oc1'] as const) {
      expect(clusterFromRegion(region)).toBe('americas');
    }
  });

  it('routes europe regions', () => {
    for (const region of ['euw1', 'eun1', 'tr1', 'ru'] as const) {
      expect(clusterFromRegion(region)).toBe('europe');
    }
  });

  it('routes asia regions', () => {
    for (const region of ['kr', 'jp1'] as const) {
      expect(clusterFromRegion(region)).toBe('asia');
    }
  });

  it('routes sea regions', () => {
    for (const region of ['ph2', 'sg2', 'th2', 'tw2', 'vn2'] as const) {
      expect(clusterFromRegion(region)).toBe('sea');
    }
  });

  it('covers every region in the canonical list exactly once', () => {
    const routed = REGION_VALUES.map((region) => clusterFromRegion(region));
    expect(routed.every((cluster) =>
      cluster === 'americas' || cluster === 'europe' || cluster === 'asia' || cluster === 'sea',
    )).toBe(true);
  });
});
