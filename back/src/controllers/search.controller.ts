import type { Request, Response } from 'express';
import { searchService } from '../services/search.service.js';
import { searchSuggestQuerySchema } from '../validators/search.validator.js';

// HTTP layer for search suggestions: validates input, calls the service,
// and shapes the response. Holds no business logic.
export const searchController = {
  // GET /api/v1/search/suggest?q=faker
  async getSuggestions(req: Request, res: Response) {
    const query = searchSuggestQuerySchema.parse(req.query);
    const suggestions = await searchService.suggest(query);
    res.json({ success: true, data: { suggestions } });
  },
};
