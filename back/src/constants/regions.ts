// ── Riot routing values (single source of truth) ──
// https://developer.riotgames.com/docs/lol#routing-values

// Riot clusters (account/match-level routing): continental groupings.
export type RiotCluster = 'americas' | 'europe' | 'asia' | 'sea';

// Riot regions (summoner/league/mastery-level routing): per-server platforms.
export const REGION_VALUES = [
  'na1', 'br1', 'la1', 'la2', 'oc1',
  'euw1', 'eun1', 'tr1', 'ru',
  'kr', 'jp1',
  'ph2', 'sg2', 'th2', 'tw2', 'vn2',
] as const;

export type RiotRegion = (typeof REGION_VALUES)[number];

// Maps a region (na1/euw1/kr/…) to its cluster. Used to route Account v1
// and Match v5 (cluster-routed) from a region the caller already knows.
export function clusterFromRegion(region: RiotRegion): RiotCluster {
  switch (region) {
    case 'na1': case 'br1': case 'la1': case 'la2': case 'oc1':
      return 'americas';
    case 'euw1': case 'eun1': case 'tr1': case 'ru':
      return 'europe';
    case 'kr': case 'jp1':
      return 'asia';
    default:
      // SEA cluster (sea.api.riotgames.com) — ph2/sg2/th2/tw2/vn2.
      return 'sea';
  }
}
