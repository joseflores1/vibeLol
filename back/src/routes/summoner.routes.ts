import { Router } from 'express';
import { accountController } from '../controllers/account.controller.js';

// Routes for resolving League of Legends summoners. Mounted under
// /api/v1/summoners by the root router. "Summoner" is the user-facing term;
// the underlying Riot entity this resolves first is Account v1.
const router = Router();

router.get('/by-riot-id/:gameName/:tagLine', accountController.getByRiotId);

export { router as summonerRoutes };