import type { Request, Response } from 'express';
import type { RiotRegion } from '../riot/client.js';
import { summonerService } from '../services/summoner.service.js';
import {
  riotIdParamSchema,
  regionQuerySchema,
} from '../validators/summoner.validator.js';

// HTTP layer for the Summoner entity: validates input, calls the service,
// and shapes the response. Holds no business logic.
export const summonerController = {
  // GET /api/v1/summoners/by-riot-id/:gameName/:tagLine?region=na1
  // Region defaults to na1 if omitted. Matches op.gg/lolalytics UX where
  // the user selects a region before searching.
  async getByRiotId(req: Request, res: Response) {
    const { gameName, tagLine } = riotIdParamSchema.parse(req.params);
    const { region } = regionQuerySchema.parse(req.query);
    const result = await summonerService.findByRiotId(
      region as RiotRegion,
      gameName,
      tagLine,
    );
    res.json({ success: true, data: result });
  },
};