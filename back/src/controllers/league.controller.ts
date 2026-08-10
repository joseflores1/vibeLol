import type { Request, Response } from 'express';
import type { RiotRegion } from '../riot/client.js';
import { leagueService } from '../services/league.service.js';
import { riotIdParamSchema, regionQuerySchema } from '../validators/summoner.validator.js';

// HTTP layer for League (ranked) entries. Validates input, calls the
// service, and shapes the response. Holds no business logic.
//
// Summoner-scoped per AGENTS.md §5a — no puuid in any public URL.
export const leagueController = {
  // GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/league?region=na1
  // Returns { puuid, entries: LeagueEntry[] } — empty array if unranked.
  async getEntries(req: Request, res: Response) {
    const { gameName, tagLine } = riotIdParamSchema.parse(req.params);
    const { region } = regionQuerySchema.parse(req.query);
    const result = await leagueService.findEntriesByRiotId(
      region as RiotRegion,
      gameName,
      tagLine,
    );
    res.json({ success: true, data: result });
  },
};