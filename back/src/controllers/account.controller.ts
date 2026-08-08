import type { Request, Response } from 'express';
import type { RiotCluster } from '../riot/client.js';
import { accountService } from '../services/account.service.js';
import { riotIdParamSchema } from '../validators/account.validator.js';

// HTTP layer for the Account entity: validates input, calls the service,
// and shapes the response. Holds no business logic.
export const accountController = {
  // GET /api/v1/summoners/by-riot-id/:gameName/:tagLine
  // Cluster is hardcoded to americas for now; Riot routing by region is a
  // later concern (americas covers NA/LAN/LAS/BR/OCE servers, which is the
  // most common starting point). Account v1 is cluster-routed regardless.
  async getByRiotId(req: Request, res: Response) {
    const { gameName, tagLine } = riotIdParamSchema.parse(req.params);
    const cluster: RiotCluster = 'americas';
    const account = await accountService.findByRiotId(cluster, gameName, tagLine);
    res.json({ success: true, data: account });
  },
};