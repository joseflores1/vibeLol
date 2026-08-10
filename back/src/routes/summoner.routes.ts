import { Router } from 'express';
import { summonerController } from '../controllers/summoner.controller.js';
import { matchController } from '../controllers/match.controller.js';
import { leagueController } from '../controllers/league.controller.js';
import { masteryController } from '../controllers/mastery.controller.js';

// Routes for resolving League of Legends summoners + their stats.
// Mounted under /api/v1/summoners by the root router. Riot-ID-first.
// Region is a query param (?region=na1) per AGENTS.md §5a.
//
// All endpoints are summoner-scoped — no puuid in any public URL.
const router = Router();

// Summoner profile: account + summoner data
router.get('/by-riot-id/:gameName/:tagLine', summonerController.getByRiotId);

// Match history: list of match IDs (frontend lazy-fetches details on scroll)
router.get('/by-riot-id/:gameName/:tagLine/matches', matchController.getMatchIds);

// Match detail: full match + 10 participants (cached in Postgres)
router.get('/by-riot-id/:gameName/:tagLine/matches/:matchId', matchController.getMatchById);

// Ranked entries (solo/duo + flex) — empty array if unranked
router.get('/by-riot-id/:gameName/:tagLine/league', leagueController.getEntries);

// Champion mastery: full list (frontend sorts/slices locally)
router.get('/by-riot-id/:gameName/:tagLine/mastery', masteryController.getMastery);

// Single champion mastery lookup
router.get('/by-riot-id/:gameName/:tagLine/mastery/:championId', masteryController.getMasteryByChampion);

export { router as summonerRoutes };