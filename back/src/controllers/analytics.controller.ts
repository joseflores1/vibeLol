import type { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import {
  analyticsQuerySchema,
  analyticsScopeQuerySchema,
  championIdParamSchema,
} from '../validators/analytics.validator.js';

// HTTP layer for champion analytics: validates input, calls the service,
// and shapes the response. Holds no business logic.
export const analyticsController = {
  // GET /api/v1/analytics/champions?queue=420&patch=15.16.1&start=0&count=20
  async getChampionStats(req: Request, res: Response) {
    const query = analyticsQuerySchema.parse(req.query);
    const result = await analyticsService.findChampionStats(query);
    res.json({ success: true, data: result });
  },

  // GET /api/v1/analytics/champions/:championId?queue=420&patch=15.16.1
  async getChampionDetail(req: Request, res: Response) {
    const { championId } = championIdParamSchema.parse(req.params);
    const scope = analyticsScopeQuerySchema.parse(req.query);
    const result = await analyticsService.findChampionDetail(championId, scope);
    res.json({ success: true, data: result });
  },
};
