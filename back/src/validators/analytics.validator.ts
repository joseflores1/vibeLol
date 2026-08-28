import { z } from 'zod';
import { ANALYTICS_ELIGIBLE_QUEUE_IDS } from '../constants/queues.js';

// Shared scope filters: queue + patch. Omitting `queue` aggregates over ALL
// analytics-eligible queues; passing a non-eligible one (ARAM, Bots, URF,
// Arena, tutorials) is a 400 — enforced here so the service never has to
// defend against it.
export const analyticsScopeQuerySchema = z.object({
  queue: z.coerce.number().int().optional()
    .refine(
      (queue) => queue === undefined || ANALYTICS_ELIGIBLE_QUEUE_IDS.includes(queue),
      { message: 'Queue is not analytics-eligible' },
    ),
  // Riot match gameVersion bucket (e.g. "15.16.1"). Plain string equality —
  // gameVersion values come straight from Match v5.
  patch: z.string().min(1).max(20).optional(),
});

// Query params for GET /api/v1/analytics/champions (list endpoint).
export const analyticsQuerySchema = analyticsScopeQuerySchema.extend({
  start: z.coerce.number().int().min(0).default(0),
  count: z.coerce.number().int().min(1).max(100).default(20),
});

// Route param for GET /api/v1/analytics/champions/:championId.
export const championIdParamSchema = z.object({
  championId: z.coerce.number().int().min(0),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type AnalyticsScopeQuery = z.infer<typeof analyticsScopeQuerySchema>;
export type ChampionIdParam = z.infer<typeof championIdParamSchema>;
