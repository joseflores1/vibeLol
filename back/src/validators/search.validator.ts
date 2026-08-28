import { z } from 'zod';

// Query params for GET /api/v1/search/suggest. Minimum 2 characters keeps
// the prefix scan meaningful over the Account cache.
export const searchSuggestQuerySchema = z.object({
  q: z.string().trim().min(2).max(32),
});

export type SearchSuggestQuery = z.infer<typeof searchSuggestQuerySchema>;
