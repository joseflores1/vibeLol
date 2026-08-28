import { z } from 'zod';
import { REGION_VALUES } from '../constants/regions.js';

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