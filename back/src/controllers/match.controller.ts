import type { Request, Response } from 'express';
import type { RiotRegion } from '../riot/client.js';
import { matchService } from '../services/match.service.js';
import { riotIdParamSchema } from '../validators/summoner.validator.js';
import {
  matchIdParamSchema,
  matchListQuerySchema,
} from '../validators/match.validator.js';

// HTTP layer for Match endpoints. Validates input, calls the service,
// and shapes the response. Holds no business logic.
//
// Both endpoints are summoner-scoped (per AGENTS.md §5a — no puuids in
// public URLs). The summoner in the path resolves the region context;
// the matchId itself encodes the region prefix for Riot routing.
export const matchController = {
  // GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/matches
  //   ?region=na1&start=0&count=20&queue=420&type=ranked
  // Returns { puuid, matchIds: string[] } — the frontend lazy-fetches
  // match details on scroll via getMatchById.
  async getMatchIds(req: Request, res: Response) {
    const { gameName, tagLine } = riotIdParamSchema.parse(req.params);
    const query = matchListQuerySchema.parse(req.query);
    const { region, start, count, startTime, endTime, queue, type } = query;
    const result = await matchService.findMatchIdsByRiotId(
      region as RiotRegion,
      gameName,
      tagLine,
      { start, count, startTime, endTime, queue, type },
    );
    res.json({ success: true, data: result });
  },

  // GET /api/v1/summoners/by-riot-id/:gameName/:tagLine/matches/:matchId
  //   ?region=na1
  // Returns the full match + 10 participants. Cached in Postgres;
  // refetches from Riot on cache miss only.
  async getMatchById(req: Request, res: Response) {
    const { gameName, tagLine } = riotIdParamSchema.parse(req.params);
    const { matchId } = matchIdParamSchema.parse(req.params);
    const query = matchListQuerySchema.pick({ region: true }).parse(req.query);
    const match = await matchService.findMatchById(
      query.region as RiotRegion,
      matchId,
    );
    res.json({ success: true, data: match });
    // gameName/tagLine are validated but not used for lookup — the matchId
    // is self-sufficient. They're in the URL for UX consistency (the
    // summoner scoping is a presentation concern, not a routing one).
    void gameName; void tagLine;
  },
};