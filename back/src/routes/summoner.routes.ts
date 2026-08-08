import { Router } from 'express';
import { summonerController } from '../controllers/summoner.controller.js';
import { matchController } from '../controllers/match.controller.js';

// Routes for resolving League of Legends summoners + their match history.
// Mounted under /api/v1/summoners by the root router. The Riot-ID-first
// flow: Riot ID → Account v1 (puuid) → Summoner v4 / Match v5.
// Region is a query param (?region=na1) because Summoner v4 is region-routed.
//
// Per AGENTS.md §5a: puuid never appears in public URLs — all endpoints
// are summoner-scoped via the Riot ID in the path.
const router = Router();

// Summoner profile: account + summoner data
router.get('/by-riot-id/:gameName/:tagLine', summonerController.getByRiotId);

// Match history: list of match IDs (frontend lazy-fetches details on scroll)
router.get('/by-riot-id/:gameName/:tagLine/matches', matchController.getMatchIds);

// Match detail: full match + 10 participants (cached in Postgres)
router.get('/by-riot-id/:gameName/:tagLine/matches/:matchId', matchController.getMatchById);

export { router as summonerRoutes };