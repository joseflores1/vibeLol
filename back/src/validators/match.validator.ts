import { z } from 'zod';

// Match ID format: region-prefixed + underscore + numeric ID
// (e.g. NA1_5000000000, EUW1_1234567890, KR_9876543210).
export const matchIdParamSchema = z.object({
  matchId: z.string().regex(/^[A-Z0-9]+_\d+$/, 'Invalid match ID format'),
});

// Query params for the match history list endpoint.
export const matchListQuerySchema = z.object({
  region: z.enum([
    'na1', 'br1', 'la1', 'la2', 'oc1',
    'euw1', 'eun1', 'tr1', 'ru',
    'kr', 'jp1',
    'ph2', 'sg2', 'th2', 'tw2', 'vn2',
  ]).default('na1'),
  start: z.coerce.number().int().min(0).default(0),
  count: z.coerce.number().int().min(1).max(100).default(20),
  startTime: z.coerce.number().int().min(0).optional(),
  endTime: z.coerce.number().int().min(0).optional(),
  queue: z.coerce.number().int().min(0).optional(),
  type: z.enum(['ranked', 'normal', 'tourney', 'tournament']).optional(),
});

export type MatchIdParam = z.infer<typeof matchIdParamSchema>;
export type MatchListQuery = z.infer<typeof matchListQuerySchema>;