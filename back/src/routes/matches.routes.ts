import { Router } from 'express';
import { matchesController } from '../controllers/matches.controller.js';

// Match-scoped routes (no summoner context — a timeline belongs to the
// match, not to the player who navigated there). Mounted under
// /api/v1/matches by the root router.
const router = Router();

router.get('/:matchId/timeline', matchesController.getTimeline);

export { router as matchRoutes };
