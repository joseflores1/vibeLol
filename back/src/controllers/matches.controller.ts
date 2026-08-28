import type { Request, Response } from 'express';
import { matchService } from '../services/match.service.js';
import { matchIdParamSchema } from '../validators/match.validator.js';
import { regionQuerySchema } from '../validators/summoner.validator.js';
import type { RiotRegion } from '../riot/client.js';

// HTTP layer for match-scoped endpoints (matchId is Riot's region-prefixed
// public handle — safe in URLs per AGENTS.md §5a).
export const matchesController = {
  // GET /api/v1/matches/:matchId/timeline?region=na1
  async getTimeline(req: Request, res: Response) {
    const { matchId } = matchIdParamSchema.parse(req.params);
    const { region } = regionQuerySchema.parse(req.query);
    const result = await matchService.findTimeline(region as RiotRegion, matchId);
    res.json({ success: true, data: result });
  },
};
