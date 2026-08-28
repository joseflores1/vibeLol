import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';

// Champion analytics routes. Mounted under /api/v1/analytics by the root
// router. Only reads from the cached match_participants table — never
// calls Riot, so responses are cheap and rate-limit friendly.
const router = Router();

router.get('/champions', analyticsController.getChampionStats);
router.get('/champions/:championId', analyticsController.getChampionDetail);

export { router as analyticsRoutes };
