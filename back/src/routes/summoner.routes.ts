import { Router } from 'express';
import { summonerController } from '../controllers/summoner.controller.js';

// Routes for resolving League of Legends summoners. Mounted under
// /api/v1/summoners by the root router. The Riot-ID-first flow:
//   Riot ID → Account v1 (puuid) → Summoner v4 (summonerId, level, icon).
// Region is a query param (?region=na1) because Summoner v4 is region-routed.
const router = Router();

router.get('/by-riot-id/:gameName/:tagLine', summonerController.getByRiotId);

export { router as summonerRoutes };