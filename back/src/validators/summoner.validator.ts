import { z } from 'zod';
import type { RiotRegion } from '../riot/client.js';

// All 16 Riot regions (platform routing) — from Riot's routing values table.
const REGION_VALUES = [
  'na1', 'br1', 'la1', 'la2', 'oc1',
  'euw1', 'eun1', 'tr1', 'ru',
  'kr', 'jp1',
  'ph2', 'sg2', 'th2', 'tw2', 'vn2',
] as const;

// Param schema for routes that resolve a Riot ID (gameName#tagLine).
export const riotIdParamSchema = z.object({
  gameName: z.string().min(1),
  tagLine: z.string().min(1),
});

// Query schema for the region selector. Defaults to na1 (most common
// starting point for NA-based dev keys). All 16 Riot regions are valid.
export const regionQuerySchema = z.object({
  region: z.enum(REGION_VALUES).default('na1'),
});

// Types inferred from the schemas, reused as the service input types.
export type RiotIdParam = z.infer<typeof riotIdParamSchema>;
export type RegionQuery = z.infer<typeof regionQuerySchema>;
// Re-export the region enum tuple for use in services/tests.
export { REGION_VALUES };
// Convenience: a strongly-typed region string (validated by zod at runtime).
export type Region = RiotRegion;