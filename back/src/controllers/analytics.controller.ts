import type { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { analyticsQuerySchema } from '../validators/analytics.validator.js';

// HTTP layer for champion analytics: validates input, calls the service,
// and shapes the response. Holds no business logic.
export const analyticsController = {
  // GET /api/v1/analytics/champions?queue=420&patch=15.16.1&start=0&count=20
  async getChampionStats(req: Request, res: Response) {
    const query = analyticsQuerySchema.parse(req.query);
    const result = await analyticsService.findChampionStats(query);
    res.json({ success: true, data: result });
  },
};
