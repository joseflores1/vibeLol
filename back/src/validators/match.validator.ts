import { z } from 'zod';
import { REGION_VALUES } from '../constants/regions.js';
import { queueById } from '../constants/queues.js';

// Match ID format: region-prefixed + underscore + numeric ID
// (e.g. NA1_5000000000, EUW1_1234567890, KR_9876543210).
export const matchIdParamSchema = z.object({
  matchId: z.string().regex(/^[A-Z0-9]+_\d+$/, 'Invalid match ID format'),
});

// Query params for the match history list endpoint. Custom-queue matches
// require RSO opt-in before public display (AGENTS.md §5), so asking Riot
// to filter on a custom queue is rejected outright — defense in depth on
// top of the service-level filter.
export const matchListQuerySchema = z.object({
  region: z.enum(REGION_VALUES).default('na1'),
  start: z.coerce.number().int().min(0).default(0),
  count: z.coerce.number().int().min(1).max(100).default(20),
  startTime: z.coerce.number().int().min(0).optional(),
  endTime: z.coerce.number().int().min(0).optional(),
  queue: z.coerce.number().int().min(0).optional()
    .refine(
      (queue) => queue === undefined || !queueById.get(queue)?.custom,
      { message: 'Custom-queue matches are not exposed' },
    ),
  type: z.enum(['ranked', 'normal', 'tourney', 'tournament']).optional(),
});

export type MatchIdParam = z.infer<typeof matchIdParamSchema>;
export type MatchListQuery = z.infer<typeof matchListQuerySchema>;