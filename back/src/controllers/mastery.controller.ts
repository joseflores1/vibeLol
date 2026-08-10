import type { Request, Response } from 'express';
import type { RiotRegion } from '../riot/client.js';
import { masteryService } from '../services/mastery.service.js';
import { riotIdParamSchema, regionQuerySchema } from '../validators/summoner.validator.js';
import { championIdParamSchema } from '../validators/mastery.validator.js';

// HTTP layer for Champion Mastery. Validates input, calls the service,
// and shapes the response. Holds no business logic.
//
// Summoner-scoped per AGENTS.md §5a — no puuid in any public URL.
export const masteryController = {
  // GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/mastery?region=na1
  // Returns { puuid, masteries: ChampionMastery[] } — empty array if no
  // mastery data. Frontend sorts/slices locally (no /top endpoint).
  async getMastery(req: Request, res: Response) {
    const { gameName, tagLine } = riotIdParamSchema.parse(req.params);
    const { region } = regionQuerySchema.parse(req.query);
    const result = await masteryService.findByRiotId(
      region as RiotRegion,
      gameName,
      tagLine,
    );
    res.json({ success: true, data: result });
  },

  // GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/mastery/:championId?region=na1
  // Returns { puuid, mastery: ChampionMastery } for a single champion.
  // 404 from Riot (no mastery for that champion) propagates as ApiError.notFound.
  async getMasteryByChampion(req: Request, res: Response) {
    const { gameName, tagLine } = riotIdParamSchema.parse(req.params);
    const { championId } = championIdParamSchema.parse(req.params);
    const { region } = regionQuerySchema.parse(req.query);
    const result = await masteryService.findByChampion(
      region as RiotRegion,
      gameName,
      tagLine,
      championId,
    );
    res.json({ success: true, data: result });
  },
};